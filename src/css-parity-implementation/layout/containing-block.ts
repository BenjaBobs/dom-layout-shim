import type { Viewport } from '../../api/layout-engine-config.ts';
import { resolveDefiniteLength } from '../css/length-value.ts';
import type { SupportedStyle } from '../css/supported-style.ts';
import type { BoxInsets } from './box-metrics.ts';
import { effectiveBorderWidth } from './taffy/taffy-style.ts';

export type PercentageBasis = { width?: number; height?: number };
export type ContainingBlockEnvironment = {
  viewport: Viewport;
  style(element: Element): SupportedStyle;
  layout?(
    element: Element,
  ): ({ width: number; height: number } & Partial<BoxInsets>) | undefined;
};

export function containingBlock(
  element: Element,
  style: SupportedStyle,
  environment: ContainingBlockEnvironment,
): Element | null {
  if (style.position === 'fixed') return null;
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const parentStyle = environment.style(parent);
    if (parentStyle.display === 'contents') continue;
    if (style.position !== 'absolute' || parentStyle.position !== 'static')
      return parent;
  }
  return null;
}

export function percentageBasis(
  element: Element,
  style: SupportedStyle,
  environment: ContainingBlockEnvironment,
): PercentageBasis {
  const parent = containingBlock(element, style, environment);
  // The synthetic document root continues to use the configured viewport.
  if (
    !parent ||
    parent === element.ownerDocument.body ||
    parent === element.ownerDocument.documentElement
  )
    return environment.viewport;
  const parentStyle = environment.style(parent);
  const ancestorBasis = percentageBasis(parent, parentStyle, environment);
  const measured = environment.layout?.(parent);
  const border = measured?.border ?? effectiveBorderWidth(parentStyle);
  // CSS percentage padding on either axis resolves against the containing
  // block's inline size, rather than the element's eventual measured size.
  const paddingX = measured?.padding
    ? measured.padding.left + measured.padding.right
    : (resolveDefiniteLength(parentStyle.padding.left, ancestorBasis.width) ??
        0) +
      (resolveDefiniteLength(parentStyle.padding.right, ancestorBasis.width) ??
        0);
  const paddingY = measured?.padding
    ? measured.padding.top + measured.padding.bottom
    : (resolveDefiniteLength(parentStyle.padding.top, ancestorBasis.width) ??
        0) +
      (resolveDefiniteLength(parentStyle.padding.bottom, ancestorBasis.width) ??
        0);
  const borderX = border.left + border.right;
  const borderY = border.top + border.bottom;
  const positioned = style.position === 'absolute';
  const dimension = (
    axis: 'width' | 'height',
    padding: number,
    borderSize: number,
  ) => {
    let specified = resolveDefiniteLength(
      parentStyle[axis],
      ancestorBasis[axis],
    );
    const start = resolveDefiniteLength(
      axis === 'width' ? parentStyle.left : parentStyle.top,
      ancestorBasis[axis],
    );
    const end = resolveDefiniteLength(
      axis === 'width' ? parentStyle.right : parentStyle.bottom,
      ancestorBasis[axis],
    );
    const stretched =
      (parentStyle.position === 'absolute' ||
        parentStyle.position === 'fixed') &&
      start !== undefined &&
      end !== undefined &&
      ancestorBasis[axis] !== undefined;
    if (measured && (axis === 'width' || specified !== undefined || stretched))
      return Math.max(
        0,
        measured[axis] - borderSize - (positioned ? 0 : padding),
      );
    if (specified === undefined && stretched)
      return Math.max(
        0,
        (ancestorBasis[axis] ?? 0) -
          (start ?? 0) -
          (end ?? 0) -
          borderSize -
          (positioned ? 0 : padding),
      );
    if (specified === undefined) return undefined;
    if (parentStyle.boxSizing === 'border-box')
      specified = Math.max(0, specified - padding - borderSize);
    return specified + (positioned ? padding : 0);
  };
  return {
    width: dimension('width', paddingX, borderX),
    height: dimension('height', paddingY, borderY),
  };
}
