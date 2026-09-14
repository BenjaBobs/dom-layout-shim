import type { Box } from '../../api/box.ts';
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
import type { LayoutSnapshot } from './layout-source.ts';

export function projectLayoutGeometry(
  document: Document,
  geometry: Pick<
    LayoutGeometry,
    'rects' | 'fragmentRects' | 'clientRects' | 'hitBoxes'
  >,
  styles: Pick<WeakMap<Element, SupportedStyle>, 'get'>,
  contentsElements: ReadonlySet<Element>,
): Pick<
  LayoutSnapshot,
  'rects' | 'fragmentRects' | 'intersectionRects' | 'boxes'
> {
  // Taffy intentionally owns flow geometry and does not model CSS transforms.
  // Apply transforms after collection so getBoundingClientRect and hit testing
  // see visual geometry while offset/client APIs retain the layout boxes.
  const transforms = new Map<Element, AffineTransform>();
  const rects = new Map(geometry.rects);
  const fragmentRects = new Map(geometry.fragmentRects);
  const intersectionRects = new Map<Element, Box>();

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
      rects.set(element, transformBox(box, transform));
    }

    const fragments = geometry.fragmentRects.get(element);
    if (fragments) {
      fragmentRects.set(
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
  for (const [element, box] of geometry.rects) {
    // Intersection observations consume the same projected clip chain as hit
    // testing. Client/offset dimensions intentionally remain layout geometry.
    const normal = geometry.fragmentRects.get(element);
    if (!normal?.length) {
      intersectionRects.set(element, box);
      continue;
    }
    const original = box;
    intersectionRects.set(
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
  const boxes = [...geometry.hitBoxes.values()].flat().flatMap(box => {
    const polygon = clip(
      box.element,
      transformBoxPoints(box, transforms.get(box.element) ?? identityTransform),
    );
    const bounds = polygonBounds(polygon);
    return bounds.width > 0 && bounds.height > 0
      ? [{ ...box, ...bounds, polygon }]
      : [];
  });
  return { rects, fragmentRects, intersectionRects, boxes };
}
