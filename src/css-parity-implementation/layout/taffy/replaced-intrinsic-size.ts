import type { SupportedStyle } from '../../css/supported-style.ts';
import type { Size } from './taffy-bindings.ts';

export type ReplacedIntrinsicSize = {
  size: Size<number>;
  aspectRatio?: number;
  ratioOnly?: boolean;
};

export function readReplacedIntrinsicSize(
  element: Element,
): ReplacedIntrinsicSize | undefined {
  const tag = element.tagName.toLowerCase();
  if (tag !== 'img' && tag !== 'svg' && tag !== 'canvas') return undefined;
  if (hasIntrinsicSizeOverride(element)) return undefined;
  const width = dimensionAttribute(element, 'width');
  const height = dimensionAttribute(element, 'height');
  if (tag === 'img') {
    const image = element as HTMLImageElement;
    const naturalWidth = positiveNumber(image.naturalWidth);
    const naturalHeight = positiveNumber(image.naturalHeight);
    return {
      size: {
        width: naturalWidth ?? width ?? 0,
        height: naturalHeight ?? height ?? 0,
      },
      aspectRatio:
        naturalWidth && naturalHeight
          ? naturalWidth / naturalHeight
          : undefined,
    };
  }
  if (tag === 'canvas') {
    const size = { width: width ?? 300, height: height ?? 150 };
    return {
      size,
      aspectRatio:
        size.width > 0 && size.height > 0
          ? size.width / size.height
          : undefined,
    };
  }
  const viewBox = element
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const viewBoxRatio =
    viewBox?.length === 4 &&
    viewBox.every(Number.isFinite) &&
    (viewBox[2] ?? 0) > 0 &&
    (viewBox[3] ?? 0) > 0
      ? (viewBox[2] ?? 0) / (viewBox[3] ?? 0)
      : undefined;
  const aspectRatio = width && height ? width / height : viewBoxRatio;
  return {
    size: {
      width:
        width ??
        (height !== undefined && aspectRatio ? height * aspectRatio : 300),
      height: height ?? (aspectRatio ? (width ?? 300) / aspectRatio : 150),
    },
    aspectRatio,
    ratioOnly:
      width === undefined && height === undefined && aspectRatio !== undefined,
  };
}

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

function dimensionAttribute(
  element: Element,
  name: string,
): number | undefined {
  const value = element.getAttribute(name)?.trim();
  if (!value || !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:px)?$/.test(value))
    return undefined;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function positiveNumber(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function hasIntrinsicSizeOverride(element: Element): boolean {
  return ['data-layout-width', 'data-layout-height'].every(name => {
    const value = element.getAttribute(name);
    return !!value && Number.isFinite(Number(value));
  });
}
