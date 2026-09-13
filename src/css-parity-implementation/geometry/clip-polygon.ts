import type { Box } from '../../api/box.ts';
import type { Point } from './point.ts';
import type { AffineTransform } from './transform.ts';

export function polygonBounds(points: readonly Point[]): Box {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...points.map(point => point.x));
  const y = Math.min(...points.map(point => point.y));
  return {
    x,
    y,
    width: Math.max(...points.map(point => point.x)) - x,
    height: Math.max(...points.map(point => point.y)) - y,
  };
}

export function clipPolygonToBox(
  points: readonly Point[],
  box: Box,
  transform: AffineTransform,
  axes: { x: boolean; y: boolean },
): readonly Point[] {
  const determinant = transform.a * transform.d - transform.b * transform.c;
  if (determinant === 0) return [];
  // Evaluate each half-plane in its clip owner's coordinate space. This keeps
  // a parent's clip stationary when its child moves, and supports reflected or
  // rotated ancestors without replacing the clip with an axis-aligned union.
  const localX = (point: Point) =>
    (transform.d * (point.x - transform.e) -
      transform.c * (point.y - transform.f)) /
    determinant;
  const localY = (point: Point) =>
    (-transform.b * (point.x - transform.e) +
      transform.a * (point.y - transform.f)) /
    determinant;
  let clipped = points;
  if (axes.x) {
    clipped = clipHalfPlane(clipped, point => localX(point) - box.x);
    clipped = clipHalfPlane(
      clipped,
      point => box.x + box.width - localX(point),
    );
  }
  if (axes.y) {
    clipped = clipHalfPlane(clipped, point => localY(point) - box.y);
    clipped = clipHalfPlane(
      clipped,
      point => box.y + box.height - localY(point),
    );
  }
  return clipped;
}

function clipHalfPlane(
  points: readonly Point[],
  distance: (point: Point) => number,
): Point[] {
  const result: Point[] = [];
  let previous = points.at(-1);
  if (!previous) return result;
  let previousDistance = distance(previous);
  for (const point of points) {
    const currentDistance = distance(point);
    if (currentDistance >= 0 !== previousDistance >= 0) {
      const fraction = previousDistance / (previousDistance - currentDistance);
      result.push({
        x: previous.x + fraction * (point.x - previous.x),
        y: previous.y + fraction * (point.y - previous.y),
      });
    }
    if (currentDistance >= 0) result.push(point);
    previous = point;
    previousDistance = currentDistance;
  }
  return result;
}
