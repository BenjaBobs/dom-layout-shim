import { containsPoint } from '../geometry/box.ts'
import type { HitBox } from './hit-box.ts'
import { compareHitOrder } from './stacking-order.ts'

export function elementsFromPointInBoxes(boxes: readonly HitBox[], x: number, y: number): Element[] {
  return boxes
    .filter((box) => box.visibility !== 'hidden')
    .filter((box) => box.pointerEvents !== 'none')
    .filter((box) => containsPoint(box, x, y))
    .toSorted(compareHitOrder)
    .map((box) => box.element)
}

export function elementFromPointInBoxes(
  boxes: readonly HitBox[],
  x: number,
  y: number,
): Element | null {
  return elementsFromPointInBoxes(boxes, x, y)[0] ?? null
}
