import type { Box } from '../../api/box.ts';
import type { HitBox } from '../../api/hit-box.ts';
import type { ScrollOffset } from './layout-source.ts';

/** Fresh output for one collection/projection; never reused by scroll snapshots. */
export type LayoutGeometry = {
  boxes: HitBox[];
  /** Untransformed until visual projection, then viewport bounding rectangles. */
  rects: Map<Element, Box>;
  fragmentRects: Map<Element, Box[]>;
  /** Untransformed geometry for offset APIs and scroll-overflow collection. */
  layoutRects: Map<Element, Box>;
  normalRects: Map<Element, Box>;
  /** Resize observation excludes non-replaced inline boxes. */
  resizeRects: Map<Element, Box>;
  /** Layout client/content boxes; transforms do not change native dimensions. */
  clientRects: Map<Element, Box>;
  contentRects: Map<Element, Box>;
  /** Visual rectangles after applying the ancestor clip chain. */
  intersectionRects: Map<Element, Box>;
  scrollSizes: Map<Element, { width: number; height: number }>;
  elementScrolls: Map<Element, ScrollOffset>;
};

export function createLayoutGeometry(): LayoutGeometry {
  return {
    boxes: [],
    rects: new Map(),
    fragmentRects: new Map(),
    layoutRects: new Map(),
    normalRects: new Map(),
    resizeRects: new Map(),
    clientRects: new Map(),
    contentRects: new Map(),
    intersectionRects: new Map(),
    scrollSizes: new Map(),
    elementScrolls: new Map(),
  };
}
