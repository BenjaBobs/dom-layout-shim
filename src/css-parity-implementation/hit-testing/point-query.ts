import { containsPoint } from '../../api/box.ts'
import type { HitBox } from '../../api/hit-box.ts'
import { compareHitOrder } from './stacking-order.ts'

export function elementsFromPointInBoxes(boxes: readonly HitBox[], x: number, y: number): Element[] {
  return boxes
    .filter((box) => box.visibility === 'visible')
    .filter((box) => box.pointerEvents !== 'none')
    .filter((box) => box.polygon ? containsPointInPolygon(box.polygon, x, y) : containsPoint(box, x, y))
    .toSorted(compareHitOrder)
    .map((box) => box.element)
}

function containsPointInPolygon(points: readonly { x: number; y: number }[], x: number, y: number): boolean {
  let inside = false

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const currentPoint = points[index]
    const previousPoint = points[previous]
    if (!currentPoint || !previousPoint) continue
    const crosses = (currentPoint.y > y) !== (previousPoint.y > y) &&
      x < (previousPoint.x - currentPoint.x) * (y - currentPoint.y) /
        (previousPoint.y - currentPoint.y) + currentPoint.x
    if (crosses) inside = !inside
  }

  return inside
}

export function elementFromPointInBoxes(
  boxes: readonly HitBox[],
  x: number,
  y: number,
): Element | null {
  return elementsFromPointInBoxes(boxes, x, y)[0] ?? null
}
