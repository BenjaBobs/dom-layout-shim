import type { SupportedStyle } from '../css/supported-style.ts';
import {
  type ContainingBlockEnvironment,
  containingBlock,
} from './containing-block.ts';
import type { ScrollOffset } from './layout-source.ts';
import type { LayoutReadState } from './layout-state.ts';

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
  state.geometry.record(element, { kind: 'none' });
  state.geometry.recordScrollOffset(element, readElementScrollOffset(element));
}

export function markSubtreeDisplayNone(
  element: Element,
  state: LayoutReadState,
): void {
  markElementNoBox(element, state);

  for (const child of state.formatting.element(element).children) {
    markSubtreeDisplayNone(child, state);
  }
}

export function markSubtreeNoBox(
  element: Element,
  state: LayoutReadState,
): void {
  markElementNoBox(element, state);

  for (const child of state.formatting.element(element).children) {
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

export function renderedElementChildren(
  parent: Element,
  state: LayoutReadState,
): readonly Element[] {
  return state.formatting.element(parent).children;
}
