import { expect, expectTypeOf, it } from 'vitest';
import { createDefaultStyle } from '../../src/css-parity-implementation/css/supported-style.ts';
import { emptyBoxInsets } from '../../src/css-parity-implementation/layout/box-metrics.ts';
import type {
  GeometryRecord,
  PaintMetadata,
} from '../../src/css-parity-implementation/layout/geometry-record.ts';
import { createLayoutGeometry } from '../../src/css-parity-implementation/layout/layout-geometry.ts';
import { projectLayoutGeometry } from '../../src/css-parity-implementation/layout/project-layout.ts';

const paint: PaintMetadata = {
  zIndex: 0,
  domOrder: 0,
  pointerEvents: 'auto',
  visibility: 'visible',
};
const box = { x: 10, y: 20, width: 30, height: 40 };
const principal: GeometryRecord = {
  kind: 'principal',
  box,
  layoutBox: box,
  normalBox: box,
  insets: emptyBoxInsets,
  paint,
};

it('replaces all derived geometry when an element loses its principal box', () => {
  const geometry = createLayoutGeometry();
  const element = document.createElement('div');
  geometry.record(element, principal);
  expect(geometry.hitBoxes.get(element)).toHaveLength(1);
  geometry.record(element, { kind: 'none' });
  expect(geometry.hitBoxes.get(element)).toEqual([]);
  expect(geometry.fragmentRects.get(element)).toEqual([]);
  expect(geometry.rects.get(element)?.width).toBe(0);
  expect(geometry.clientRects.get(element)?.width).toBe(0);
  expect(geometry.contentRects.get(element)?.width).toBe(0);
  // Producers cannot independently patch derived outputs or author hit regions.
  expectTypeOf(geometry.rects).not.toHaveProperty('set');
  expectTypeOf(geometry.fragmentRects).not.toHaveProperty('set');
  expectTypeOf(principal).not.toHaveProperty('clientRects');
  expectTypeOf(principal).not.toHaveProperty('hitBoxes');
});

it('requires scroll completion and rejects writes through retained scratch handles', () => {
  const geometry = createLayoutGeometry();
  const element = document.createElement('div');
  geometry.record(element, principal);
  expect(() => geometry.complete(new Map())).toThrow('scroll offset');
  geometry.recordScrollOffset(element, { x: 0, y: 0 });
  expect(() => geometry.complete(new Map())).toThrow('scroll size');
  const completed = geometry.complete(
    new Map([[element, { width: 30, height: 40 }]]),
  );
  expectTypeOf(completed).not.toHaveProperty('record');
  expectTypeOf(completed.scrollSizes).not.toHaveProperty('set');
  expect(() => geometry.record(element, { kind: 'none' })).toThrow(
    'completed geometry',
  );
  expect(() => geometry.recordScrollOffset(element, { x: 0, y: 1 })).toThrow(
    'completed geometry',
  );
  expect(completed.rects.get(element)).toEqual(box);
});

it('completes inline and no-box scroll outputs without requiring a principal scroll pass', () => {
  const geometry = createLayoutGeometry();
  const element = document.createElement('span');
  geometry.record(element, { kind: 'inline', fragments: [box], paint });
  geometry.recordScrollOffset(element, { x: 0, y: 0 });
  const completed = geometry.complete(new Map());
  expect(completed.scrollSizes.get(element)).toEqual({ width: 0, height: 0 });
  expect(completed.hitBoxes.get(element)?.[0]).toMatchObject(box);
});

it('projects repeatedly without modifying or transforming completed geometry twice', () => {
  const element = document.createElement('div');
  document.body.replaceChildren(element);
  const geometry = createLayoutGeometry();
  geometry.record(element, principal);
  geometry.recordScrollOffset(element, { x: 0, y: 0 });
  const completed = geometry.complete(
    new Map([[element, { width: 30, height: 40 }]]),
  );
  const style = createDefaultStyle();
  style.transform = [{ type: 'translate', x: 10, y: 0 }];
  const styles = new WeakMap([[element, style]]);
  const first = projectLayoutGeometry(document, completed, styles, new Set());
  const second = projectLayoutGeometry(document, completed, styles, new Set());
  expect(first).toEqual(second);
  expect(first.rects).not.toBe(completed.rects);
  expect(first.rects.get(element)).not.toEqual(box);
  expect(completed.rects.get(element)).toEqual(box);
  expect(completed.fragmentRects.get(element)).toEqual([box]);
});
