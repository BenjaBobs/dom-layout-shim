export type Box = {
  x: number
  y: number
  width: number
  height: number
}

export function containsPoint(box: Box, x: number, y: number): boolean {
  return x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height
}

export function zeroBox(): Box {
  return { x: 0, y: 0, width: 0, height: 0 }
}
