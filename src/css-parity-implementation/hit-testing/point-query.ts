import { containsPoint } from '../../api/box.ts';
import type { HitBox } from '../../api/hit-box.ts';
import { compareHitOrder } from './stacking-order.ts';

export function elementsFromPointInBoxes(
  boxes: readonly HitBox[],
  x: number,
  y: number,
): Element[] {
  const elements: Element[] = [];
  for (const box of orderedHitBoxes(boxes)) {
    if (hitContainsPoint(box, x, y)) elements.push(box.element);
  }
  return elements;
}

const snapshotHitBoxes = new WeakMap<readonly HitBox[], readonly HitBox[]>();

export function prepareHitTesting(boxes: readonly HitBox[]): void {
  snapshotHitBoxes.set(boxes, sortHitBoxes(boxes));
}

function sortHitBoxes(boxes: readonly HitBox[]): HitBox[] {
  return boxes
    .filter(box => box.visibility === 'visible' && box.pointerEvents !== 'none')
    .toSorted(compareHitOrder);
}

function orderedHitBoxes(boxes: readonly HitBox[]): readonly HitBox[] {
  // Only prepared snapshot arrays are immutable. Keep standalone algorithm
  // callers correct when they mutate their own arrays between queries.
  return snapshotHitBoxes.get(boxes) ?? sortHitBoxes(boxes);
}

function hitContainsPoint(box: HitBox, x: number, y: number): boolean {
  return box.polygon
    ? containsPointInPolygon(box.polygon, x, y)
    : containsPoint(box, x, y);
}

function containsPointInPolygon(
  points: readonly { x: number; y: number }[],
  x: number,
  y: number,
): boolean {
  let inside = false;

  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index, index += 1
  ) {
    const currentPoint = points[index];
    const previousPoint = points[previous];
    if (!currentPoint || !previousPoint) continue;
    const crosses =
      currentPoint.y > y !== previousPoint.y > y &&
      x <
        ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }

  return inside;
}

export function elementFromPointInBoxes(
  boxes: readonly HitBox[],
  x: number,
  y: number,
): Element | null {
  for (const box of orderedHitBoxes(boxes)) {
    if (hitContainsPoint(box, x, y)) return box.element;
  }
  return null;
}
