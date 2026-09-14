import { expect, it, vi } from 'vitest';
import { normalizeConfig } from '../../src/api/layout-engine-config.ts';
import type { LayoutSnapshot } from '../../src/css-parity-implementation/layout/layout-source.ts';
import { TaffyTree } from '../../src/css-parity-implementation/layout/taffy/taffy-bindings.ts';
import {
  computeTaffyDocumentLayout,
  type LayoutStylesheetCache,
  loadTaffyBackend,
  reprojectTaffyDocumentLayout,
} from '../../src/css-parity-implementation/layout/taffy-layout-source.ts';

it.each([
  '<div style="width:80px;height:200px;padding:10%;border:2px solid"><span>Percentage padded text</span></div>',
  '<div style="height:200px;transform:translateX(10px)"><span style="font-size:20px">one two three four five</span></div>',
  '<table style="border-spacing:0"><tbody><tr><td style="padding:0"><div style="width:100px;height:150px"><span>Cell text</span></div></td></tr></tbody></table>',
  '<div style="height:200px"><div style="position:sticky;top:0;height:20px">Sticky</div><div style="position:fixed;top:10px;left:200px;width:20px;height:20px"></div></div>',
])(
  'keeps projected snapshots immutable and equivalent to full computation: %s',
  async content => {
    document.body.innerHTML = `<div id="scroller" style="width:100px;height:40px;overflow:auto">${content}</div>`;
    const elements = Array.from(document.body.querySelectorAll('*'));
    elements.forEach((element, index) => {
      element.id ||= `element-${index}`;
    });
    const scroller = elements[0] as HTMLElement;
    const config = normalizeConfig({ viewport: { width: 400, height: 300 } });
    const cache: LayoutStylesheetCache = {};
    await loadTaffyBackend();
    const compute = (scroll: { x: number; y: number }) =>
      computeTaffyDocumentLayout(
        document,
        config.viewport,
        scroll,
        config.unsupportedCss,
        config.textMeasurer,
        config.stylesheets,
        config.userAgentStyles,
        config.nativeControlMetrics,
        cache,
      );
    const initial = compute({ x: 0, y: 0 });
    const savedInitial = serialize(initial);
    scroller.scrollTop = 25;
    const backend = vi.spyOn(TaffyTree.prototype, 'computeLayoutWithMeasure');
    const projected = reprojectTaffyDocumentLayout(
      document,
      config.viewport,
      { x: 0, y: 10 },
      cache,
    );
    expect(backend).not.toHaveBeenCalled();
    backend.mockRestore();
    expect(projected).toBeDefined();
    expect(projected?.rects).not.toBe(initial.rects);
    expect(projected?.boxes).not.toBe(initial.boxes);
    expect(serialize(initial)).toBe(savedInitial);
    expect(serialize(projected)).toBe(serialize(compute({ x: 0, y: 10 })));
    scroller.scrollTop = 0;
    expect(
      serialize(
        reprojectTaffyDocumentLayout(
          document,
          config.viewport,
          { x: 0, y: 0 },
          cache,
        ),
      ),
    ).toBe(savedInitial);
  },
);

function serialize(snapshot: LayoutSnapshot | undefined): string {
  return JSON.stringify(snapshot, (_key, value) => {
    if (value instanceof Element) return value.id || value.tagName;
    if (value instanceof Map || value instanceof Set) return [...value];
    return value;
  });
}
