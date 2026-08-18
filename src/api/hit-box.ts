import type { Box } from './box.ts'

export type HitBox = Box & {
  element: Element
  zIndex: number
  domOrder: number
  /** CSS paint-order key, ordered from the root stacking context inward. */
  stackingOrder?: readonly number[]
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden' | 'collapse'
  polygon?: readonly { x: number; y: number }[]
}
