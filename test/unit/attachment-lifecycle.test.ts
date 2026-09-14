import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { attachLayoutEngine, isLayoutEngineAttached } from '../../src/index.ts';

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Missing test fixture');
  return value;
}

function publicDescriptors(target: object): PropertyDescriptorMap {
  return Object.fromEntries(
    Object.entries(Object.getOwnPropertyDescriptors(target)).filter(
      ([, descriptor]) =>
        descriptor.get ||
        descriptor.set ||
        typeof descriptor.value === 'function',
    ),
  );
}

function descriptors(objects: object[]): Map<object, PropertyDescriptorMap> {
  const result = new Map<object, PropertyDescriptorMap>();
  for (const object of objects) {
    for (
      let target: object | null = object;
      target && target !== Object.prototype;
      target = Object.getPrototypeOf(target)
    ) {
      if (!result.has(target)) result.set(target, publicDescriptors(target));
    }
  }
  return result;
}

function expectRestored(before: Map<object, PropertyDescriptorMap>): void {
  for (const [target, original] of before)
    expect(publicDescriptors(target)).toEqual(original);
}

describe('attachment lifecycle', () => {
  it('restores own and inherited DOM descriptors, including CSSOM, and permits reattachment', async () => {
    const window = new Window({ width: 900, height: 700 });
    try {
      const document = window.document;
      document.body.innerHTML =
        '<style>@media (min-width: 1px) { div { width: 20px } }</style><div></div><input>';
      const sheet = required(required(document.querySelector('style')).sheet);
      const mediaRule = sheet.cssRules[0] as unknown as CSSMediaRule;
      const styleRule = mediaRule.cssRules[0] as CSSStyleRule;
      const div = required(document.querySelector('div'));
      const before = descriptors([
        window.Element.prototype,
        window.HTMLElement.prototype,
        window.HTMLInputElement.prototype,
        sheet,
        mediaRule,
        mediaRule.media,
        styleRule,
        styleRule.style,
      ]);
      const ownBefore = [
        window,
        document,
        div,
        required(document.querySelector('input')),
      ].map(
        object => [object, Object.getOwnPropertyDescriptors(object)] as const,
      );
      const nativeRect = div.getBoundingClientRect;
      expect(isLayoutEngineAttached(window)).toBe(false);
      const attachment = await attachLayoutEngine({
        window,
        viewport: { width: 300, height: 200 },
      });
      expect(isLayoutEngineAttached(window)).toBe(true);
      div.getBoundingClientRect(); // Install lazy stylesheet revision hooks.
      attachment.detach();
      attachment.detach();
      expect(isLayoutEngineAttached(window)).toBe(false);
      expectRestored(before);
      // Window/document internal caches may grow, so compare only public patches.
      for (const [object, original] of ownBefore) {
        for (const key of [
          'innerWidth',
          'innerHeight',
          'matchMedia',
          'ResizeObserver',
          'IntersectionObserver',
          'elementFromPoint',
          'elementsFromPoint',
          'getBoundingClientRect',
          'getClientRects',
        ])
          expect(Object.getOwnPropertyDescriptor(object, key)).toEqual(
            original[key],
          );
      }
      expect(div.getBoundingClientRect).toBe(nativeRect);
      expect(window.innerWidth).toBe(900);
      expect(window.innerHeight).toBe(700);
      expect(() => attachment.setViewport({ width: 1, height: 1 })).toThrow(
        'detached',
      );
      expect(() => attachment.flushLayout()).toThrow('detached');
      const next = await attachLayoutEngine({ window });
      styleRule.style.setProperty('width', '30px');
      expect(div.getBoundingClientRect().width).toBe(30);
      next.detach();
      expectRestored(before);
    } finally {
      window.close();
    }
  });

  it('keeps replacement attachments and other windows active', async () => {
    const first = new Window();
    const second = new Window();
    try {
      const original = descriptors([
        first.Element.prototype,
        second.Element.prototype,
      ]);
      first.document.body.innerHTML =
        '<style>div { width: 10px }</style><div></div>';
      second.document.body.innerHTML =
        '<style>div { width: 20px }</style><div></div>';
      const old = await attachLayoutEngine({ window: first });
      const other = await attachLayoutEngine({ window: second });
      first.document.body.getBoundingClientRect();
      second.document.body.getBoundingClientRect();
      const replacement = await attachLayoutEngine({
        window: first,
        viewport: { width: 300, height: 200 },
      });
      old.detach();
      expect(isLayoutEngineAttached(first)).toBe(true);
      expect(first.innerWidth).toBe(300);
      replacement.detach();
      expect(isLayoutEngineAttached(first)).toBe(false);
      expect(isLayoutEngineAttached(second)).toBe(true);
      const div = required(second.document.querySelector('div'));
      div.style.width = '40px';
      expect(div.getBoundingClientRect().width).toBe(40);
      expect(() =>
        first.document.createElement('div').getBoundingClientRect(),
      ).not.toThrow();
      other.detach();
      expectRestored(original);
    } finally {
      first.close();
      second.close();
    }
  });

  it('keeps a shared adopted stylesheet tracked until its final owner detaches', async () => {
    const first = new Window();
    const second = new Window();
    try {
      const sheet = new first.CSSStyleSheet();
      sheet.replaceSync('div { width: 10px }');
      first.document.adoptedStyleSheets = [sheet];
      second.document.adoptedStyleSheets = [sheet];
      first.document.body.innerHTML = '<div></div>';
      second.document.body.innerHTML = '<div></div>';
      const before = descriptors([
        sheet,
        sheet.cssRules[0],
        (sheet.cssRules[0] as unknown as CSSStyleRule).style,
      ]);
      const one = await attachLayoutEngine({ window: first });
      const two = await attachLayoutEngine({ window: second });
      const firstDiv = required(first.document.querySelector('div'));
      const secondDiv = required(second.document.querySelector('div'));
      firstDiv.getBoundingClientRect();
      secondDiv.getBoundingClientRect();
      sheet.insertRule('@media (min-width: 1px) { div { width: 20px } }', 1);
      firstDiv.getBoundingClientRect(); // Discover new objects while both scopes own the sheet.
      one.detach();
      const media = sheet.cssRules[1] as unknown as CSSMediaRule;
      (media.cssRules[0] as CSSStyleRule).style.width = '30px';
      expect(secondDiv.getBoundingClientRect().width).toBe(30);
      media.media.mediaText = '(min-width: 2000px)';
      expect(secondDiv.getBoundingClientRect().width).toBe(10);
      two.detach();
      expectRestored(before);
    } finally {
      first.close();
      second.close();
    }
  });

  it('cancels scheduled delivery and disconnects retained observers', async () => {
    const window = new Window();
    try {
      const request = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockReturnValue(
          42 as unknown as ReturnType<typeof window.requestAnimationFrame>,
        );
      const cancel = vi.spyOn(window, 'cancelAnimationFrame');
      const disconnect = vi.spyOn(
        window.MutationObserver.prototype,
        'disconnect',
      );
      const attachment = await attachLayoutEngine({ window });
      const resized = vi.fn();
      const intersected = vi.fn();
      const resize = new (
        window.ResizeObserver as unknown as typeof ResizeObserver
      )(resized);
      const intersection = new (
        window.IntersectionObserver as unknown as typeof IntersectionObserver
      )(intersected);
      resize.observe(window.document.body as unknown as Element);
      intersection.observe(window.document.body as unknown as Element);
      expect(request).toHaveBeenCalled();
      attachment.detach();
      expect(cancel).toHaveBeenCalledWith(42);
      expect(disconnect).toHaveBeenCalledTimes(2);
      for (const [callback] of request.mock.calls) callback(0);
      expect(resized).not.toHaveBeenCalled();
      expect(intersected).not.toHaveBeenCalled();
      expect(intersection.takeRecords()).toEqual([]);
      expect(() => resize.disconnect()).not.toThrow();
      expect(() => intersection.disconnect()).not.toThrow();
      expect(() =>
        resize.observe(window.document.body as unknown as Element),
      ).toThrow('detached');
      request.mockRestore();
      cancel.mockRestore();
      disconnect.mockRestore();
    } finally {
      window.close();
    }
  });

  it('restores partial patches when attachment fails', async () => {
    const window = new Window();
    try {
      const native = window.document.body.getBoundingClientRect;
      Object.defineProperty(window, 'innerWidth', {
        configurable: false,
        value: 900,
      });
      await expect(attachLayoutEngine({ window })).rejects.toThrow();
      expect(isLayoutEngineAttached(window)).toBe(false);
      expect(window.document.body.getBoundingClientRect).toBe(native);
      expect(window.innerWidth).toBe(900);
    } finally {
      window.close();
    }
  });
});
