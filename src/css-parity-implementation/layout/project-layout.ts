import type { SupportedStyle } from '../css/supported-style.ts';
import { clipPolygonToBox, polygonBounds } from '../geometry/clip-polygon.ts';
import type { Point } from '../geometry/point.ts';
import {
  type AffineTransform,
  elementTransform,
  identityTransform,
  multiplyTransforms,
  transformBox,
  transformBoxPoints,
} from '../geometry/transform.ts';
import type { LayoutGeometry } from './layout-geometry.ts';

export function projectLayoutGeometry(
  document: Document,
  geometry: LayoutGeometry,
  styles: Pick<WeakMap<Element, SupportedStyle>, 'get'>,
  contentsElements: ReadonlySet<Element>,
): void {
  // Taffy intentionally owns flow geometry and does not model CSS transforms.
  // Apply transforms after collection so getBoundingClientRect and hit testing
  // see visual geometry while offset/client APIs retain the layout boxes.
  const transforms = new Map<Element, AffineTransform>();
  const untransformedRects = new Map(geometry.rects);

  for (const element of Array.from(document.getElementsByTagName('*'))) {
    const parentTransform = element.parentElement
      ? (transforms.get(element.parentElement) ?? identityTransform)
      : identityTransform;
    const box = geometry.rects.get(element);
    const style = styles.get(element);
    const localTransform =
      box &&
      style &&
      !contentsElements.has(element) &&
      style.display !== 'none' &&
      style.display !== 'inline'
        ? elementTransform(
            box,
            [style.translate, style.scale, ...style.transform].filter(
              value => value !== undefined,
            ),
            style.transformOrigin,
          )
        : identityTransform;
    const transform = multiplyTransforms(parentTransform, localTransform);
    transforms.set(element, transform);

    if (box) {
      geometry.rects.set(element, transformBox(box, transform));
    }

    const fragments = geometry.fragmentRects.get(element);
    if (fragments) {
      geometry.fragmentRects.set(
        element,
        fragments.map(fragment => transformBox(fragment, transform)),
      );
    }
  }

  const clip = (element: Element, polygon: readonly Point[]) => {
    let clipped = polygon;
    let current: Element | null = element;
    while (current?.parentElement) {
      if (styles.get(current)?.position === 'fixed') break;
      current = current.parentElement;
      const style = styles.get(current);
      const clientBox = geometry.clientRects.get(current);
      if (!style || !clientBox || contentsElements.has(current)) continue;
      clipped = clipPolygonToBox(
        clipped,
        clientBox,
        transforms.get(current) ?? identityTransform,
        {
          x: style.overflowX !== 'visible',
          y: style.overflowY !== 'visible',
        },
      );
    }
    return clipped;
  };
  for (const [element, box] of geometry.intersectionRects) {
    // Intersection observations consume the same projected clip chain as hit
    // testing. Client/offset dimensions intentionally remain layout geometry.
    const normal = geometry.fragmentRects.get(element);
    if (!normal?.length) continue;
    const original = untransformedRects.get(element) ?? box;
    geometry.intersectionRects.set(
      element,
      polygonBounds(
        clip(
          element,
          transformBoxPoints(
            original,
            transforms.get(element) ?? identityTransform,
          ),
        ),
      ),
    );
  }
  geometry.boxes = geometry.boxes.flatMap(box => {
    const polygon = clip(
      box.element,
      transformBoxPoints(box, transforms.get(box.element) ?? identityTransform),
    );
    const bounds = polygonBounds(polygon);
    return bounds.width > 0 && bounds.height > 0
      ? [{ ...box, ...bounds, polygon }]
      : [];
  });
}
