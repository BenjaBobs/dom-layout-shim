import type { Box } from '../../api/box.ts';

type Insets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

/** Resolved layout values, never authored CSS lengths or percentages. */
export type BoxInsets = Readonly<{ border: Insets; padding: Insets }>;

const zeroInsets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
export const emptyBoxInsets: BoxInsets = {
  border: zeroInsets,
  padding: zeroInsets,
};

export function boxMetrics(
  box: Readonly<Box>,
  insets: BoxInsets,
): {
  client: Box;
  content: Box;
} {
  const client = insetBox(box, insets.border);
  return { client, content: insetBox(client, insets.padding) };
}

function insetBox(box: Readonly<Box>, edges: Insets): Box {
  return {
    x: box.x + edges.left,
    y: box.y + edges.top,
    width: Math.max(0, box.width - edges.left - edges.right),
    height: Math.max(0, box.height - edges.top - edges.bottom),
  };
}
