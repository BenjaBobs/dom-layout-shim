import { expect, expectTypeOf, it } from 'vitest';
import { createDefaultStyle } from '../../src/css-parity-implementation/css/supported-style.ts';
import { emptyBoxInsets } from '../../src/css-parity-implementation/layout/box-metrics.ts';
import {
  createLayoutGeometry,
  type ElementGeometry,
} from '../../src/css-parity-implementation/layout/layout-geometry.ts';
import { projectLayoutGeometry } from '../../src/css-parity-implementation/layout/project-layout.ts';

it('replaces complete element output without retaining stale hit fragments', () => {
  const geometry = createLayoutGeometry();
  const element = document.createElement('div');
  const box = { x: 10, y: 20, width: 30, height: 40 };
  const output: ElementGeometry = {
    insets: emptyBoxInsets,
    rects: box,
    fragmentRects: [box],
    layoutRects: box,
    normalRects: box,
    resizeRects: box,
    clientRects: box,
    contentRects: box,
    hitBoxes: [
      {
        ...box,
        element,
        zIndex: 0,
        domOrder: 0,
        pointerEvents: 'auto',
        visibility: 'visible',
      },
    ],
  };
  geometry.record(element, output);
  geometry.record(element, { ...output, fragmentRects: [], hitBoxes: [] });
  expect(geometry.hitBoxes.get(element)).toEqual([]);
  expect(geometry.fragmentRects.get(element)).toEqual([]);
  for (const key of Object.keys(output) as (keyof ElementGeometry)[]) {
    expect([...geometry[key].keys()]).toEqual([element]);
  }
  // Producers cannot patch one metric while leaving the other outputs stale.
  expectTypeOf(geometry.rects).not.toHaveProperty('set');
  expectTypeOf(geometry.fragmentRects).not.toHaveProperty('set');
});

it('projects repeatedly without modifying or transforming the layout input twice', () => {
  const element = document.createElement('div');
  document.body.replaceChildren(element);
  const geometry = createLayoutGeometry();
  const box = { x: 10, y: 20, width: 30, height: 40 };
  geometry.record(element, {
    insets: emptyBoxInsets,
    rects: box,
    fragmentRects: [box],
    layoutRects: box,
    normalRects: box,
    resizeRects: box,
    clientRects: box,
    contentRects: box,
    hitBoxes: [],
  });
  const style = createDefaultStyle();
  style.transform = [{ type: 'translate', x: 10, y: 0 }];
  const styles = new WeakMap([[element, style]]);
  const first = projectLayoutGeometry(document, geometry, styles, new Set());
  const second = projectLayoutGeometry(document, geometry, styles, new Set());
  expect(first).toEqual(second);
  expect(first.rects).not.toBe(geometry.rects);
  expect(first.rects.get(element)).not.toEqual(box);
  expect(geometry.rects.get(element)).toEqual(box);
  expect(geometry.fragmentRects.get(element)).toEqual([box]);
});
