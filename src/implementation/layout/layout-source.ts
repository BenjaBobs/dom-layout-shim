import type { Box } from '../../api/box.ts'
import type { HitBox } from '../../api/hit-box.ts'

export type LayoutSnapshot = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
  elementScrolls: Map<Element, ScrollOffset>
}

export type ScrollOffset = {
  x: number
  y: number
}
