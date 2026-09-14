import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaffyTree } from '../../src/css-parity-implementation/layout/taffy/taffy-bindings.ts';
import {
  attachLayoutEngine,
  createDeterministicTextMeasurer,
} from '../../src/index.ts';

afterEach(() => {
  vi.restoreAllMocks();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.adoptedStyleSheets = [];
});

describe('layout cache reuse', () => {
  it('does not scan selectors or element scroll offsets on unchanged reads', async () => {
    document.body.innerHTML =
      '<style>.box { width:100px;height:20px }</style><div class="box"></div>';
    await attachLayoutEngine({ window });
    const box = document.querySelector('.box') as HTMLElement;
    box.getBoundingClientRect();
    const query = vi.spyOn(document, 'querySelectorAll');
    const scroll = vi.spyOn(box, 'scrollTop', 'get');
    for (let index = 0; index < 100; index += 1) {
      box.getBoundingClientRect();
      document.elementFromPoint(5, 5);
    }
    expect(query).not.toHaveBeenCalled();
    expect(scroll).not.toHaveBeenCalled();
  });

  it('reuses computed flow on scrolling but rebuilds after synchronous DOM edits', async () => {
    document.body.innerHTML =
      '<div id="scroller" style="width:100px;height:30px;overflow:auto"><div id="text" style="height:200px">Label</div></div>';
    const measure = vi.fn(() => ({ width: 30, height: 20 }));
    await attachLayoutEngine({ window, textMeasurer: { measure } });
    const scroller = document.querySelector('#scroller') as HTMLElement;
    scroller.getBoundingClientRect();
    const compute = vi.spyOn(TaffyTree.prototype, 'computeLayoutWithMeasure');
    measure.mockClear();
    scroller.scrollTop = 20;
    scroller.getBoundingClientRect();
    expect(compute).not.toHaveBeenCalled();
    expect(measure).not.toHaveBeenCalled();
    document.querySelector('#text')?.setAttribute('style', 'height:250px');
    scroller.getBoundingClientRect();
    expect(compute).toHaveBeenCalled();
  });

  it('reuses inline fragment measurements when scrolling', async () => {
    document.body.innerHTML =
      '<div id="scroller" style="width:100px;height:30px;overflow:auto"><div style="height:200px"><span>Some label</span></div></div>';
    const measure = vi.fn((input: { text: string }) => ({
      width: input.text.length * 10,
      height: 20,
    }));
    await attachLayoutEngine({ window, textMeasurer: { measure } });
    const scroller = document.querySelector('#scroller') as HTMLElement;
    scroller.getBoundingClientRect();
    measure.mockClear();
    scroller.scrollTop = 20;
    document.querySelector('span')?.getClientRects();
    expect(measure).not.toHaveBeenCalled();
  });

  it('reuses other sheets and parsed media rules across CSSOM edits and viewport changes', async () => {
    document.body.innerHTML = '<div class="box"></div>';
    const first = new CSSStyleSheet();
    first.replaceSync(
      '.box { width:100px;height:20px } @media (min-width:600px) { .box { width:200px } }',
    );
    const second = new CSSStyleSheet();
    second.replaceSync('.box { height:30px }');
    document.adoptedStyleSheets = [first, second];
    const layoutEngine = await attachLayoutEngine({
      window,
      viewport: { width: 500, height: 300 },
    });
    const box = document.querySelector('.box') as HTMLElement;
    expect(box.getBoundingClientRect().width).toBe(100);
    const serialize = vi.spyOn(first.cssRules[0], 'cssText', 'get');
    (second.cssRules[0] as CSSStyleRule).style.height = '40px';
    expect(box.getBoundingClientRect().height).toBe(40);
    layoutEngine.setViewport({ width: 700, height: 300 });
    expect(box.getBoundingClientRect().width).toBe(200);
    expect(serialize).not.toHaveBeenCalled();
  });

  it('shares matching between style and custom-property resolution and invalidates it', async () => {
    document.body.innerHTML =
      '<style>.box { --size:40px; width:var(--size);height:20px } .wide { width:80px }</style><div class="box"></div>';
    await attachLayoutEngine({ window });
    const box = document.querySelector('.box') as HTMLElement;
    const matches = vi.spyOn(box, 'matches');
    expect(box.getBoundingClientRect().width).toBe(40);
    expect(
      matches.mock.calls.filter(([selector]) => selector === '.box'),
    ).toHaveLength(1);
    box.classList.add('wide');
    expect(box.getBoundingClientRect().width).toBe(80);
  });

  it('rechecks host hover state after pointer events without polling on every read', async () => {
    document.body.innerHTML =
      '<style>.box { width:40px;height:20px } .box:hover { width:80px }</style><div class="box"></div>';
    const box = document.querySelector('.box') as HTMLElement;
    let hovered = false;
    const originalMatches = box.matches.bind(box);
    vi.spyOn(box, 'matches').mockImplementation(selector =>
      selector === '.box:hover' ? hovered : originalMatches(selector),
    );
    const originalQuery = document.querySelectorAll.bind(document);
    vi.spyOn(document, 'querySelectorAll').mockImplementation(selector =>
      selector === ':hover'
        ? ((hovered ? [box] : []) as unknown as NodeListOf<Element>)
        : originalQuery(selector),
    );
    await attachLayoutEngine({ window });
    expect(box.getBoundingClientRect().width).toBe(40);
    hovered = true;
    box.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(box.getBoundingClientRect().width).toBe(80);
  });

  it('polls own host scroll properties that bypass prototype hooks', async () => {
    document.body.innerHTML =
      '<div id="scroller" style="height:30px;width:100px;overflow:auto"><div style="height:200px">Label</div></div>';
    const scroller = document.querySelector('#scroller') as HTMLElement;
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    });
    await attachLayoutEngine({ window });
    const child = scroller.firstElementChild as HTMLElement;
    const before = child.getBoundingClientRect().top;
    scroller.scrollTop = 20;
    expect(child.getBoundingClientRect().top).toBe(before - 20);
  });

  it('keeps inactive media diagnostics lazy when reusing parsed sheets', async () => {
    document.body.innerHTML =
      '<style>@media (min-width:600px) { @supports (display:block) { .box { width:20px } } }</style><div class="box"></div>';
    const layoutEngine = await attachLayoutEngine({
      window,
      viewport: { width: 500, height: 300 },
      unsupportedCss: { default: 'throw' },
    });
    const box = document.querySelector('.box') as HTMLElement;
    expect(() => box.getBoundingClientRect()).not.toThrow();
    layoutEngine.setViewport({ width: 700, height: 300 });
    expect(() => box.getBoundingClientRect()).toThrow(/unsupported/);
  });

  it('returns independent results from bounded built-in measurement caches', () => {
    const measurer = createDeterministicTextMeasurer();
    const input = {
      text: 'label',
      fontFamily: 'Arial',
      fontSize: 20,
      maxWidth: undefined,
      lineHeight: 24,
      whiteSpace: 'normal' as const,
    };
    const first = measurer.measure(input);
    const expected = { ...first };
    first.width = -1;
    expect(measurer.measure(input)).toEqual(expected);
    expect(measurer.measure({ ...input, fontSize: 40 }).width).toBeGreaterThan(
      expected.width,
    );
  });
});
