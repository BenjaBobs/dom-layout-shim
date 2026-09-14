import type { MutableSupportedStyle as SupportedStyle } from './supported-style.ts';

export function applyReplacedDimensionAttributes(
  style: SupportedStyle,
  element: Element,
): void {
  const tag = element.tagName.toLowerCase();
  if (tag !== 'img' && tag !== 'svg') return;
  if (hasIntrinsicSizeOverride(element)) return;
  const width = dimensionAttribute(element, 'width');
  const height = dimensionAttribute(element, 'height');
  style.width = width;
  style.height = height;
  // HTML image attributes are presentational sizing hints, including an auto
  // ratio fallback before a resource supplies its natural ratio. SVG attributes
  // supply intrinsic dimensions independently of CSS overrides.
  if (tag === 'img' && width && height) {
    style.aspectRatio = width / height;
    style.aspectRatioIsHint = true;
  }
}

export function dimensionAttribute(
  element: Element,
  name: string,
): number | undefined {
  const value = element.getAttribute(name)?.trim();
  if (!value || !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:px)?$/.test(value))
    return undefined;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function hasIntrinsicSizeOverride(element: Element): boolean {
  return ['data-layout-width', 'data-layout-height'].every(name => {
    const value = element.getAttribute(name);
    return !!value && Number.isFinite(Number(value));
  });
}
