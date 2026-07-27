import type { HitBox } from '../../api/hit-box.ts'

export function compareHitOrder(a: HitBox, b: HitBox): number {
  if (a.zIndex !== b.zIndex) {
    return b.zIndex - a.zIndex
  }

  return b.domOrder - a.domOrder
}
