import type { Box } from '../../api/box.ts'
import type { HitBox } from '../../api/hit-box.ts'

export type LayoutSnapshot = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
  elementScrolls: Map<Element, ScrollOffset>
  offsetParents: Map<Element, Element | null>
}

export type ScrollOffset = {
  x: number
  y: number
}
