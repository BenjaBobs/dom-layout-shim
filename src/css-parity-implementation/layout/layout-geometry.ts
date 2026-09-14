import {
  deriveGeometry,
  type ElementGeometry,
  type GeometryRecord,
} from './geometry-record.ts';
import type { ScrollOffset } from './layout-source.ts';

type GeometryMaps = {
  readonly [K in keyof ElementGeometry]: ReadonlyMap<
    Element,
    ElementGeometry[K]
  >;
};
type ScrollSize = Readonly<{ width: number; height: number }>;
export type CompletedGeometry = GeometryMaps & {
  readonly scrollSizes: ReadonlyMap<Element, ScrollSize>;
  readonly elementScrolls: ReadonlyMap<Element, ScrollOffset>;
};

/** Scratch writes require canonical input; completion seals the output. */
export type LayoutGeometry = GeometryMaps & {
  record(element: Element, input: GeometryRecord): void;
  recordScrollOffset(element: Element, offset: ScrollOffset): void;
  readonly elementScrolls: ReadonlyMap<Element, ScrollOffset>;
  complete(scrollSizes: ReadonlyMap<Element, ScrollSize>): CompletedGeometry;
};

export function createLayoutGeometry(): LayoutGeometry {
  const maps: {
    [K in keyof ElementGeometry]: Map<Element, ElementGeometry[K]>;
  } = {
    insets: new Map(),
    rects: new Map(),
    fragmentRects: new Map(),
    layoutRects: new Map(),
    normalRects: new Map(),
    resizeRects: new Map(),
    clientRects: new Map(),
    contentRects: new Map(),
    hitBoxes: new Map(),
  };
  const kinds = new Map<Element, GeometryRecord['kind']>();
  const elementScrolls = new Map<Element, ScrollOffset>();
  let completed = false;
  const assertWritable = () => {
    if (completed) throw new Error('Cannot mutate completed geometry');
  };
  function set<K extends keyof ElementGeometry>(
    key: K,
    element: Element,
    output: ElementGeometry,
  ): void {
    maps[key].set(element, output[key]);
  }
  return {
    ...maps,
    elementScrolls,
    record(element, input) {
      assertWritable();
      const output = deriveGeometry(element, input);
      kinds.set(element, input.kind);
      for (const key of Object.keys(maps) as (keyof ElementGeometry)[])
        set(key, element, output);
    },
    recordScrollOffset(element, offset) {
      assertWritable();
      elementScrolls.set(element, offset);
    },
    complete(scrollSizes) {
      assertWritable();
      const sizes = new Map(scrollSizes);
      for (const [element, kind] of kinds) {
        if (!elementScrolls.has(element))
          throw new Error('Geometry is missing an element scroll offset');
        if (kind === 'principal' && !sizes.has(element))
          throw new Error(
            'Principal geometry is missing its completed scroll size',
          );
        if (kind !== 'principal') sizes.set(element, { width: 0, height: 0 });
      }
      completed = true;
      return { ...maps, elementScrolls, scrollSizes: sizes };
    },
  };
}
