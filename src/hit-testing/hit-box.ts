import type { Box } from '../geometry/box'

export type HitBox = Box & {
  element: Element
  zIndex: number
  domOrder: number
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden'
}
