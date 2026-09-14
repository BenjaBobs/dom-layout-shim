import type { Box } from '../../api/box.ts';
import type { HitBox } from '../../api/hit-box.ts';

export type LayoutSnapshot = Readonly<{
  readonly boxes: readonly HitBox[];
  rects: ReadonlyMap<Element, Box>;
  fragmentRects: ReadonlyMap<Element, readonly Box[]>;
  layoutRects: ReadonlyMap<Element, Box>;
  resizeRects: ReadonlyMap<Element, Box>;
  clientRects: ReadonlyMap<Element, Box>;
  scrollSizes: ReadonlyMap<Element, { width: number; height: number }>;
  contentRects: ReadonlyMap<Element, Box>;
  intersectionRects: ReadonlyMap<Element, Box>;
  elementScrolls: ReadonlyMap<Element, ScrollOffset>;
  offsetParents: ReadonlyMap<Element, Element | null>;
  scrollContainers: ReadonlyMap<Element, { x: boolean; y: boolean }>;
  fixedElements: ReadonlySet<Element>;
}>;

export type ScrollOffset = {
  x: number;
  y: number;
};
