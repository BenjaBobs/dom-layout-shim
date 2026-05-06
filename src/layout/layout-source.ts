import type { Box } from '../geometry/box.ts'
import type { HitBox } from '../hit-testing/hit-box.ts'

export type LayoutSnapshot = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
}
