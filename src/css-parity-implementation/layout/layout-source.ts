import type { Box } from '../../api/box.ts';
import type { HitBox } from '../../api/hit-box.ts';

export type LayoutSnapshot = Readonly<{
  readonly boxes: readonly Readonly<HitBox>[];
  rects: ReadonlyMap<Element, Readonly<Box>>;
  fragmentRects: ReadonlyMap<Element, readonly Readonly<Box>[]>;
  layoutRects: ReadonlyMap<Element, Readonly<Box>>;
  resizeRects: ReadonlyMap<Element, Readonly<Box>>;
  clientRects: ReadonlyMap<Element, Readonly<Box>>;
  scrollSizes: ReadonlyMap<
    Element,
    Readonly<{ width: number; height: number }>
  >;
  contentRects: ReadonlyMap<Element, Readonly<Box>>;
  intersectionRects: ReadonlyMap<Element, Readonly<Box>>;
  elementScrolls: ReadonlyMap<Element, Readonly<ScrollOffset>>;
  offsetParents: ReadonlyMap<Element, Element | null>;
  scrollContainers: ReadonlyMap<Element, Readonly<{ x: boolean; y: boolean }>>;
  fixedElements: ReadonlySet<Element>;
}>;

export type ScrollOffset = {
  x: number;
  y: number;
};
