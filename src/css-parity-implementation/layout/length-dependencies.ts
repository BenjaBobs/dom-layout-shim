import type { SupportedStyle } from '../css/supported-style.ts';

export function hasCalculatedDimension(style: SupportedStyle): boolean {
  const values: unknown[] = [
    style.width,
    style.height,
    style.minWidth,
    style.minHeight,
    style.maxWidth,
    style.maxHeight,
    style.flexBasis,
    style.top,
    style.right,
    style.bottom,
    style.left,
    style.rowGap,
    style.columnGap,
    ...Object.values(style.margin),
    ...Object.values(style.padding),
  ];
  return values.some(value => typeof value === 'object' && value !== null);
}
