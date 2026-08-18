import type { HitBox } from '../../api/hit-box.ts'

export function compareHitOrder(a: HitBox, b: HitBox): number {
  if (a.stackingOrder && b.stackingOrder) {
    const length = Math.max(a.stackingOrder.length, b.stackingOrder.length)
    for (let index = 0; index < length; index += 1) {
      const aValue = a.stackingOrder[index]
      const bValue = b.stackingOrder[index]
      if (aValue === undefined) return 1
      if (bValue === undefined) return -1
      if (aValue !== bValue) return bValue - aValue
    }
  }

  if (a.zIndex !== b.zIndex) {
    return b.zIndex - a.zIndex
  }

  return b.domOrder - a.domOrder
}
