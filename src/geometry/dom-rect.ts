import type { Box } from './box.ts'

type DomRectConstructor = new (
  x?: number,
  y?: number,
  width?: number,
  height?: number,
) => DOMRect

export function createDomRect(document: Document, box: Box): DOMRect {
  const window = document.defaultView
  const DomRect = window?.DOMRect as DomRectConstructor | undefined

  if (DomRect) {
    return new DomRect(box.x, box.y, box.width, box.height)
  }

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    toJSON() {
      return this
    },
  }
}
