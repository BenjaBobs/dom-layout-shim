import type { Box } from './box.ts'

export type HitBox = Box & {
  element: Element
  zIndex: number
  domOrder: number
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden' | 'collapse'
  polygon?: readonly { x: number; y: number }[]
}
