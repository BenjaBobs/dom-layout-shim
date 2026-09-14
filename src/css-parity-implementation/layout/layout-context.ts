import type { SupportedStyle } from '../css/supported-style.ts';
import { emptyBoxInsets } from './box-metrics.ts';
import {
  type ContainingBlockEnvironment,
  containingBlock,
} from './containing-block.ts';
import type { ScrollOffset } from './layout-source.ts';
import type { LayoutReadState } from './layout-state.ts';

const nonRenderedHtmlElements = new Set([
  'base',
  'link',
  'meta',
  'noscript',
  'script',
  'style',
  'template',
  'title',
  'wbr',
]);

export function containingBlockEnvironment(
  state: LayoutReadState,
  measured = false,
): ContainingBlockEnvironment {
  return {
    viewport: state.viewport,
    style: element => resolveSupportedStyle(element, state),
    layout: measured
      ? element => {
          const node = state.elementNodes.get(element);
          return node === undefined ? undefined : state.tree.getLayout(node);
        }
      : undefined,
  };
}

export function containingBlockFor(
  element: Element,
  style: SupportedStyle,
  state: LayoutReadState,
): Element | null {
  return containingBlock(element, style, containingBlockEnvironment(state));
}

export function readElementScrollOffset(element: Element): ScrollOffset {
  return {
    x: element.scrollLeft,
    y: element.scrollTop,
  };
}

export function markElementNoBox(
  element: Element,
  state: LayoutReadState,
): void {
  const box = { x: 0, y: 0, width: 0, height: 0 };
  state.geometry.record(element, {
    insets: emptyBoxInsets,
    rects: box,
    fragmentRects: [],
    layoutRects: box,
    resizeRects: box,
    normalRects: box,
    clientRects: box,
    contentRects: box,
    hitBoxes: [],
  });
  state.geometry.elementScrolls.set(element, readElementScrollOffset(element));
}

export function markSubtreeDisplayNone(
  element: Element,
  state: LayoutReadState,
): void {
  markElementNoBox(element, state);

  for (const child of elementChildren(element)) {
    markSubtreeDisplayNone(child, state);
  }
}

export function markSubtreeNoBox(
  element: Element,
  state: LayoutReadState,
): void {
  markElementNoBox(element, state);

  for (const child of elementChildren(element)) {
    markSubtreeNoBox(child, state);
  }
}

export function resolveSupportedStyle(
  element: Element,
  state: LayoutReadState,
): SupportedStyle {
  return state.styleResolver.element(element);
}

export function resolvePseudoElementStyle(
  element: Element,
  pseudo: 'before' | 'after',
  state: LayoutReadState,
): SupportedStyle {
  return state.styleResolver.pseudo(element, pseudo);
}

export function elementChildren(parent: Element): Element[] {
  return Array.from(parent.children).filter(
    element => !isNonRenderedHtmlElement(element),
  );
}

export function renderedElementChildren(
  parent: Element,
  state: LayoutReadState,
): Element[] {
  const children = orderedElementChildren(parent, state);

  if (!isClosedDetails(parent)) {
    return children;
  }

  return children.filter(child => {
    const rendered = isSummaryElement(child);

    if (!rendered) {
      markSubtreeDisplayNone(child, state);
    }

    return rendered;
  });
}

export function orderedElementChildren(
  parent: Element,
  state: LayoutReadState,
): Element[] {
  const children = elementChildren(parent);
  const parentStyle = resolveSupportedStyle(parent, state);

  if (parentStyle.display !== 'flex' && parentStyle.display !== 'grid') {
    return children;
  }

  // CSS order participates in flex/grid layout order before Taffy sees children.
  return children.toSorted(
    (a, b) =>
      resolveSupportedStyle(a, state).order -
      resolveSupportedStyle(b, state).order,
  );
}

export function isHidden(element: Element): boolean {
  return element.hasAttribute('hidden') && !isHiddenUntilFound(element);
}

export function isHiddenUntilFound(element: Element): boolean {
  return element.getAttribute('hidden')?.toLowerCase() === 'until-found';
}

export function isClosedDetails(element: Element): boolean {
  return (
    element.tagName.toLowerCase() === 'details' && !element.hasAttribute('open')
  );
}

export function isSummaryElement(element: Element): boolean {
  return element.tagName.toLowerCase() === 'summary';
}

export function isNonRenderedHtmlElement(element: Element): boolean {
  return nonRenderedHtmlElements.has(element.tagName.toLowerCase());
}
