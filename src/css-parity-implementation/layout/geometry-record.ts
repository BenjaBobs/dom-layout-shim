import type { Box } from '../../api/box.ts';
import type { HitBox } from '../../api/hit-box.ts';
import { type BoxInsets, boxMetrics, emptyBoxInsets } from './box-metrics.ts';

export type PaintMetadata = Readonly<
  Pick<
    HitBox,
    'zIndex' | 'domOrder' | 'stackingOrder' | 'pointerEvents' | 'visibility'
  >
>;

/** Producers describe their boxes, never independently author derived metrics. */
export type GeometryRecord =
  | Readonly<{ kind: 'none' }>
  | Readonly<{
      kind: 'principal';
      box: Readonly<Box>;
      layoutBox: Readonly<Box>;
      normalBox: Readonly<Box>;
      insets: BoxInsets;
      paint: PaintMetadata | undefined;
    }>
  | Readonly<{
      kind: 'inline';
      fragments: readonly Readonly<Box>[];
      paint: PaintMetadata | undefined;
    }>;

export type ElementGeometry = {
  insets: BoxInsets;
  rects: Readonly<Box>;
  fragmentRects: readonly Readonly<Box>[];
  layoutRects: Readonly<Box>;
  normalRects: Readonly<Box>;
  resizeRects: Readonly<Box>;
  clientRects: Readonly<Box>;
  contentRects: Readonly<Box>;
  hitBoxes: readonly Readonly<HitBox>[];
};

const zero: Readonly<Box> = { x: 0, y: 0, width: 0, height: 0 };

export function deriveGeometry(
  element: Element,
  record: GeometryRecord,
): ElementGeometry {
  switch (record.kind) {
    case 'none':
      return {
        insets: emptyBoxInsets,
        rects: zero,
        fragmentRects: [],
        layoutRects: zero,
        normalRects: zero,
        resizeRects: zero,
        clientRects: zero,
        contentRects: zero,
        hitBoxes: [],
      };
    case 'principal': {
      const metrics = boxMetrics(record.box, record.insets);
      return {
        insets: record.insets,
        rects: record.box,
        fragmentRects: [record.box],
        layoutRects: record.layoutBox,
        normalRects: record.normalBox,
        resizeRects: record.layoutBox,
        clientRects: metrics.client,
        contentRects: metrics.content,
        hitBoxes: hitBoxes(element, [record.box], record.paint),
      };
    }
    case 'inline': {
      const union = unionBoxes(record.fragments);
      const first = record.fragments[0] ?? union;
      return {
        insets: emptyBoxInsets,
        rects: union,
        fragmentRects: record.fragments,
        // Offset size spans fragments; offset position belongs to the first.
        layoutRects: { ...union, x: first.x, y: first.y },
        normalRects: union,
        resizeRects: zero,
        clientRects: zero,
        contentRects: zero,
        hitBoxes: hitBoxes(element, record.fragments, record.paint),
      };
    }
  }
}

function hitBoxes(
  element: Element,
  boxes: readonly Readonly<Box>[],
  paint: PaintMetadata | undefined,
): HitBox[] {
  if (!paint) return [];
  return boxes
    .filter(box => box.width > 0 && box.height > 0)
    .map(box => ({ ...box, ...paint, element }));
}

function unionBoxes(boxes: readonly Readonly<Box>[]): Readonly<Box> {
  if (!boxes.length) return zero;
  const left = Math.min(...boxes.map(box => box.x));
  const top = Math.min(...boxes.map(box => box.y));
  const right = Math.max(...boxes.map(box => box.x + box.width));
  const bottom = Math.max(...boxes.map(box => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
