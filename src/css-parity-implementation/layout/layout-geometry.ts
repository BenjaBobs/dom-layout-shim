import type { Box } from '../../api/box.ts';
import type { HitBox } from '../../api/hit-box.ts';
import type { ScrollOffset } from './layout-source.ts';

/** Every formatting context must supply the complete, unprojected output. */
export type ElementGeometry = {
  rects: Box;
  fragmentRects: readonly Box[];
  layoutRects: Box;
  normalRects: Box;
  resizeRects: Box;
  clientRects: Box;
  contentRects: Box;
  hitBoxes: readonly HitBox[];
};

type GeometryMaps = {
  readonly [K in keyof ElementGeometry]: ReadonlyMap<
    Element,
    ElementGeometry[K]
  >;
};

/** Maps are read-only to collectors: partial geometry writes are not permitted. */
export type LayoutGeometry = GeometryMaps & {
  record(element: Element, output: ElementGeometry): void;
  scrollSizes: Map<Element, { width: number; height: number }>;
  elementScrolls: Map<Element, ScrollOffset>;
};

export function createLayoutGeometry(): LayoutGeometry {
  const maps: {
    [K in keyof ElementGeometry]: Map<Element, ElementGeometry[K]>;
  } = {
    rects: new Map(),
    fragmentRects: new Map(),
    layoutRects: new Map(),
    normalRects: new Map(),
    resizeRects: new Map(),
    clientRects: new Map(),
    contentRects: new Map(),
    hitBoxes: new Map(),
  };
  function set<K extends keyof ElementGeometry>(
    key: K,
    element: Element,
    output: ElementGeometry,
  ): void {
    maps[key].set(element, output[key]);
  }
  return {
    ...maps,
    record(element, output) {
      // Iterate the exhaustive mapped type: adding an output requires a map and
      // a value at every producer; replacement also replaces old hit fragments.
      for (const key of Object.keys(maps) as (keyof ElementGeometry)[]) {
        set(key, element, output);
      }
    },
    scrollSizes: new Map(),
    elementScrolls: new Map(),
  };
}
