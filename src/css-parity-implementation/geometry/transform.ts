import type { Box } from '../../api/box.ts'
import { resolveCalculatedDimension } from '../css/length-value.ts'
import type {
  SupportedDimension,
  SupportedTransform,
  TransformOrigin,
} from '../css/supported-style.ts'

export type AffineTransform = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const identityTransform: AffineTransform = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
}

export function multiplyTransforms(left: AffineTransform, right: AffineTransform): AffineTransform {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

export function elementTransform(
  box: Box,
  transforms: readonly SupportedTransform[],
  origin: TransformOrigin,
): AffineTransform {
  if (transforms.length === 0) {
    return identityTransform
  }

  const originX = box.x + resolveDimension(origin.x, box.width)
  const originY = box.y + resolveDimension(origin.y, box.height)
  let result = translation(originX, originY)

  for (const transform of transforms) {
    result = multiplyTransforms(result, transformMatrix(transform, box))
  }

  return multiplyTransforms(result, translation(-originX, -originY))
}

export function transformBox(box: Box, transform: AffineTransform): Box {
  const points = transformBoxPoints(box, transform)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)

  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  }
}

export function transformBoxPoints(box: Box, transform: AffineTransform): readonly { x: number; y: number }[] {
  return [
    transformPoint(box.x, box.y, transform),
    transformPoint(box.x + box.width, box.y, transform),
    transformPoint(box.x + box.width, box.y + box.height, transform),
    transformPoint(box.x, box.y + box.height, transform),
  ]
}

function transformMatrix(transform: SupportedTransform, box: Box): AffineTransform {
  if (transform.type === 'translate') {
    return translation(
      resolveDimension(transform.x, box.width),
      resolveDimension(transform.y, box.height),
    )
  }

  if (transform.type === 'rotate') {
    const cosine = Math.cos(transform.radians)
    const sine = Math.sin(transform.radians)
    return { a: cosine, b: sine, c: -sine, d: cosine, e: 0, f: 0 }
  }

  if (transform.type === 'skew') {
    return { a: 1, b: Math.tan(transform.yRadians), c: Math.tan(transform.xRadians), d: 1, e: 0, f: 0 }
  }

  if (transform.type === 'matrix') {
    return transform
  }

  return {
    a: transform.x,
    b: 0,
    c: 0,
    d: transform.y,
    e: 0,
    f: 0,
  }
}

function translation(x: number, y: number): AffineTransform {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y }
}

function resolveDimension(value: SupportedDimension, size: number): number {
  const resolved = resolveCalculatedDimension(value, size)
  if (typeof resolved === 'number') return resolved
  return Number.parseFloat(resolved ?? '0') / 100 * size
}

function transformPoint(x: number, y: number, transform: AffineTransform): { x: number; y: number } {
  return {
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  }
}
