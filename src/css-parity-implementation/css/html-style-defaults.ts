import { applyReplacedDimensionAttributes } from './html-dimensions.ts';
import type { MutableSupportedStyle as SupportedStyle } from './supported-style.ts';

const inlinePhrasingHtmlElements = new Set([
  'a',
  'b',
  'code',
  'em',
  'i',
  'kbd',
  'label',
  'mark',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
]);
function tableBorderSpacingDefault(table: Element): {
  horizontal: number;
  vertical: number;
} {
  const cellSpacing = nonNegativeAttributeNumber(table, 'cellspacing');

  if (cellSpacing === undefined) {
    return { horizontal: 2, vertical: 2 };
  }

  return { horizontal: cellSpacing, vertical: cellSpacing };
}

function applyTableDimensionAttributes(
  style: SupportedStyle,
  element: Element,
): void {
  const width = nonNegativeAttributeNumber(element, 'width');
  const height = nonNegativeAttributeNumber(element, 'height');

  style.width = width ?? style.width;
  style.height = height ?? style.height;
}

function applyTableCellPaddingDefault(
  style: SupportedStyle,
  cell: Element,
): void {
  const table = closestHtmlTable(cell);
  const cellPadding = table
    ? nonNegativeAttributeNumber(table, 'cellpadding')
    : undefined;

  if (cellPadding === undefined) {
    return;
  }

  style.padding.top = cellPadding;
  style.padding.right = cellPadding;
  style.padding.bottom = cellPadding;
  style.padding.left = cellPadding;
}

function closestHtmlTable(element: Element): Element | undefined {
  let current = element.parentElement;
  while (current) {
    if (current.tagName.toLowerCase() === 'table') return current;
    current = current.parentElement;
  }
  return undefined;
}
function nonNegativeAttributeNumber(
  element: Element,
  attribute: string,
): number | undefined {
  const value = element.getAttribute(attribute);

  if (value === null || value.trim() === '') {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function applyStructuralHtmlDefaults(
  style: SupportedStyle,
  element: Element,
): void {
  const tagName = element.tagName.toLowerCase();

  if (inlinePhrasingHtmlElements.has(tagName)) {
    style.display = 'inline';
  }

  applyReplacedDimensionAttributes(style, element);

  // HTML presentational attributes are author-origin hints, not browser-theme
  // styling. Keep them active when the portable presentation profile is off.
  if (
    tagName === 'table' ||
    tagName === 'col' ||
    tagName === 'td' ||
    tagName === 'th'
  ) {
    applyTableDimensionAttributes(style, element);
  }
  if (tagName === 'td' || tagName === 'th') {
    style.verticalAlign = 'middle';
    applyTableCellPaddingDefault(style, element);
  }
  if (tagName === 'object') {
    applyObjectFallbackAttributes(style, element);
  }
}

export function applyPortableUserAgentDefaults(
  style: SupportedStyle,
  element: Element,
): void {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'ul':
    case 'ol':
    case 'menu':
      style.margin.top = 16;
      style.margin.bottom = 16;
      style.padding.left = 40;
      return;
    case 'dl':
      style.margin.top = 16;
      style.margin.bottom = 16;
      return;
    case 'dd':
      style.margin.left = 40;
      return;
    case 'p':
      applyBlockTextDefaults(style, 16, 20, 16, 16);
      return;
    case 'blockquote':
      applyBlockTextDefaults(style, 16, 20, 16, 16);
      style.margin.left = 40;
      style.margin.right = 40;
      return;
    case 'address':
      style.fontFamily = 'Times New Roman';
      style.fontSize = 16;
      style.lineHeight = 20;
      return;
    case 'figure':
      style.margin.top = 16;
      style.margin.right = 40;
      style.margin.bottom = 16;
      style.margin.left = 40;
      return;
    case 'pre':
      applyBlockTextDefaults(style, 13, 17, 13, 13);
      style.fontFamily = 'monospace';
      style.whiteSpace = 'pre';
      return;
    case 'hr':
      style.height = 0;
      style.margin.top = 8;
      style.margin.bottom = 8;
      applyBorderDefaults(style, 'inset', 1);
      return;
    case 'dialog':
      style.position = 'absolute';
      style.zIndex = 1;
      style.zIndexAuto = false;
      style.margin.top = 'auto';
      style.margin.right = 'auto';
      style.margin.bottom = 'auto';
      style.margin.left = 'auto';
      style.padding.top = 16;
      style.padding.right = 16;
      style.padding.bottom = 16;
      style.padding.left = 16;
      applyBorderDefaults(style, 'solid', 3);
      if (!element.hasAttribute('open')) {
        style.display = 'none';
      }
      return;
    case 'table':
      style.tableBorderSpacing = tableBorderSpacingDefault(element);
      return;
    case 'col':
      return;
    case 'td':
    case 'th':
      return;
    case 'iframe':
      applyBorderDefaults(style, 'inset', 2);
      return;
    case 'object':
      return;
    case 'h1':
      applyHeadingDefaults(style, 32, 40, 21.44);
      return;
    case 'h2':
      applyHeadingDefaults(style, 24, 30, 19.92);
      return;
    case 'h3':
      applyHeadingDefaults(style, 18.72, 23, 18.72);
      return;
    case 'h4':
      applyHeadingDefaults(style, 16, 20, 21.28);
      return;
    case 'h5':
      applyHeadingDefaults(style, 13.28, 17, 22.1776);
      return;
    case 'h6':
      applyHeadingDefaults(style, 10.72, 14, 24.9776);
      return;
    case 'button':
      applyFormControlBoxDefaults(style, 'outset', 2);
      style.padding.top = 1;
      style.padding.right = 6;
      style.padding.bottom = 1;
      style.padding.left = 6;
      return;
    case 'input':
      applyInputUserAgentDefaults(style, element);
      return;
    case 'textarea':
      applyFormControlBoxDefaults(style, 'solid', 1);
      style.padding.top = 2;
      style.padding.right = 2;
      style.padding.bottom = 2;
      style.padding.left = 2;
      return;
    case 'select':
      applyFormControlBoxDefaults(style, 'solid', 1);
      return;
  }
}

export function applyPostAuthorStructuralDefaults(
  style: SupportedStyle,
  element: Element,
): void {
  if (
    element.tagName.toLowerCase() === 'input' &&
    (element.getAttribute('type') ?? 'text').toLowerCase() === 'hidden'
  ) {
    // Chromium keeps hidden inputs non-rendered even when author CSS sets
    // display:block, so this UA constraint has to run after author styles.
    style.display = 'none';
  }

  if (
    element.tagName.toLowerCase() === 'audio' &&
    !element.hasAttribute('controls')
  ) {
    // Audio elements without native controls do not generate a layout box in
    // Chromium, even when author CSS sets display:block.
    style.display = 'none';
  }
}

function applyBlockTextDefaults(
  style: SupportedStyle,
  fontSize: number,
  lineHeight: number,
  marginTop: number,
  marginBottom: number,
): void {
  style.fontFamily = 'Times New Roman';
  style.fontSize = fontSize;
  style.lineHeight = lineHeight;
  style.margin.top = marginTop;
  style.margin.bottom = marginBottom;
}

function applyHeadingDefaults(
  style: SupportedStyle,
  fontSize: number,
  lineHeight: number,
  blockMargin: number,
): void {
  applyBlockTextDefaults(style, fontSize, lineHeight, blockMargin, blockMargin);
}

function applyObjectFallbackAttributes(
  style: SupportedStyle,
  element: Element,
): void {
  if (!isObjectFallbackContentLayout(element)) {
    return;
  }

  style.width = readNumberAttribute(element, 'width') ?? style.width;
  style.height = readNumberAttribute(element, 'height') ?? style.height;
}

function isObjectFallbackContentLayout(element: Element): boolean {
  return (
    element.tagName.toLowerCase() === 'object' &&
    !element.hasAttribute('type') &&
    !element.hasAttribute('data') &&
    Array.from(element.children).some(
      child => child.tagName.toLowerCase() !== 'param',
    )
  );
}

function applyInputUserAgentDefaults(
  style: SupportedStyle,
  element: Element,
): void {
  const type = (element.getAttribute('type') ?? 'text').toLowerCase();

  style.boxSizing = 'border-box';

  if (type === 'hidden') {
    style.display = 'none';
    return;
  }

  if (type === 'file' || type === 'image') {
    return;
  }

  if (type === 'checkbox') {
    style.margin.top = 3;
    style.margin.right = 3;
    style.margin.bottom = 3;
    style.margin.left = 4;
    return;
  }

  if (type === 'radio') {
    style.margin.top = 3;
    style.margin.right = 3;
    style.margin.left = 5;
    return;
  }

  if (type === 'range') {
    style.margin.top = 2;
    style.margin.left = 2;
    style.margin.right = 2;
    style.margin.bottom = 2;
    return;
  }

  if (type === 'color') {
    applyFormControlBoxDefaults(style, 'solid', 1);
    return;
  }

  applyFormControlBoxDefaults(
    style,
    type === 'button' || type === 'submit' || type === 'reset'
      ? 'outset'
      : 'inset',
    2,
  );
  style.padding.top = 1;
  style.padding.right = 2;
  style.padding.bottom = 1;
  style.padding.left = 2;
}

function applyFormControlBoxDefaults(
  style: SupportedStyle,
  borderStyle: SupportedStyle['borderStyle']['top'],
  borderWidth: number,
): void {
  style.boxSizing = 'border-box';
  applyBorderDefaults(style, borderStyle, borderWidth);
}

function applyBorderDefaults(
  style: SupportedStyle,
  borderStyle: SupportedStyle['borderStyle']['top'],
  borderWidth: number,
): void {
  style.borderStyle.top = borderStyle;
  style.borderStyle.right = borderStyle;
  style.borderStyle.bottom = borderStyle;
  style.borderStyle.left = borderStyle;
  style.borderWidth.top = borderWidth;
  style.borderWidth.right = borderWidth;
  style.borderWidth.bottom = borderWidth;
  style.borderWidth.left = borderWidth;
}

function readNumberAttribute(
  element: Element,
  name: string,
): number | undefined {
  const value = element.getAttribute(name);

  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
