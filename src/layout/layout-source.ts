import type { Box } from '../geometry/box'
import type { HitBox } from '../hit-testing/hit-box'

export type LayoutSnapshot = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
}
