import type { Edges, SupportedStyle } from '../css/supported-style.ts';

export function effectiveBorderWidth(style: SupportedStyle): Edges {
  return {
    top: borderStyleHasGeometry(style.borderStyle.top)
      ? style.borderWidth.top
      : 0,
    right: borderStyleHasGeometry(style.borderStyle.right)
      ? style.borderWidth.right
      : 0,
    bottom: borderStyleHasGeometry(style.borderStyle.bottom)
      ? style.borderWidth.bottom
      : 0,
    left: borderStyleHasGeometry(style.borderStyle.left)
      ? style.borderWidth.left
      : 0,
  };
}

function borderStyleHasGeometry(
  style: SupportedStyle['borderStyle'][keyof SupportedStyle['borderStyle']],
): boolean {
  return style !== 'none' && style !== 'hidden';
}
