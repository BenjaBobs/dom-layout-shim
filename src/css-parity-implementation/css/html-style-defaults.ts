import type { CssDeclaration } from './declaration-list.ts';
import {
  dimensionAttribute,
  hasIntrinsicSizeOverride,
} from './html-dimensions.ts';

type Declarations = readonly CssDeclaration[];
const empty: Declarations = [];
const declarations = (values: Record<string, string>): Declarations =>
  Object.entries(values).map(([property, value]) => ({ property, value }));
const inline = declarations({ display: 'inline' });
const middle = declarations({ 'vertical-align': 'middle' });
const inlineTags = new Set([
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
const text = (
  fontSize: number,
  lineHeight: number,
  top: number,
  bottom = top,
) => ({
  'font-family': 'Times New Roman',
  'font-size': `${fontSize}px`,
  'line-height': `${lineHeight}px`,
  'margin-top': `${top}px`,
  'margin-bottom': `${bottom}px`,
});
const control = (border: string) => ({ 'box-sizing': 'border-box', border });
const list = declarations({
  'margin-top': '16px',
  'margin-bottom': '16px',
  'padding-left': '40px',
});
const portable: Record<string, Declarations> = {
  ul: list,
  ol: list,
  menu: list,
  dl: declarations({ 'margin-top': '16px', 'margin-bottom': '16px' }),
  dd: declarations({ 'margin-left': '40px' }),
  p: declarations(text(16, 20, 16)),
  blockquote: declarations({
    ...text(16, 20, 16),
    'margin-left': '40px',
    'margin-right': '40px',
  }),
  address: declarations({
    'font-family': 'Times New Roman',
    'font-size': '16px',
    'line-height': '20px',
  }),
  figure: declarations({ margin: '16px 40px' }),
  pre: declarations({
    ...text(13, 17, 13),
    'font-family': 'monospace',
    'white-space': 'pre',
  }),
  hr: declarations({
    height: '0px',
    'margin-top': '8px',
    'margin-bottom': '8px',
    border: '1px inset',
  }),
  dialog: declarations({
    position: 'absolute',
    'z-index': '1',
    margin: 'auto',
    padding: '16px',
    border: '3px solid',
  }),
  iframe: declarations({ border: '2px inset' }),
  h1: declarations(text(32, 40, 21.44)),
  h2: declarations(text(24, 30, 19.92)),
  h3: declarations(text(18.72, 23, 18.72)),
  h4: declarations(text(16, 20, 21.28)),
  h5: declarations(text(13.28, 17, 22.1776)),
  h6: declarations(text(10.72, 14, 24.9776)),
  button: declarations({ ...control('2px outset'), padding: '1px 6px' }),
  textarea: declarations({ ...control('1px solid'), padding: '2px' }),
  select: declarations(control('1px solid')),
};
const input: Record<string, Declarations> = {
  hidden: declarations({ 'box-sizing': 'border-box', display: 'none' }),
  file: declarations({ 'box-sizing': 'border-box' }),
  image: declarations({ 'box-sizing': 'border-box' }),
  checkbox: declarations({
    'box-sizing': 'border-box',
    margin: '3px 3px 3px 4px',
  }),
  radio: declarations({
    'box-sizing': 'border-box',
    'margin-top': '3px',
    'margin-right': '3px',
    'margin-left': '5px',
  }),
  range: declarations({ 'box-sizing': 'border-box', margin: '2px' }),
  color: declarations(control('1px solid')),
  button: declarations({ ...control('2px outset'), padding: '1px 2px' }),
  text: declarations({ ...control('2px inset'), padding: '1px 2px' }),
};
input.submit = input.button;
input.reset = input.button;

/** HTML supplies declaration sources, never a partially mutated computed style. */
export function htmlStyleDeclarations(
  element: Element,
  profile: 'portable' | 'none',
): {
  userAgent: Declarations;
  presentationalHints: Declarations;
} {
  const tag = element.tagName.toLowerCase();
  const structural = inlineTags.has(tag)
    ? inline
    : tag === 'td' || tag === 'th'
      ? middle
      : empty;
  let presentation = empty;
  const hints: CssDeclaration[] = [];
  const dimension = (property: string, value: number | undefined) => {
    if (value !== undefined) hints.push({ property, value: `${value}px` });
  };
  if ((tag === 'img' || tag === 'svg') && !hasIntrinsicSizeOverride(element)) {
    const width = dimensionAttribute(element, 'width');
    const height = dimensionAttribute(element, 'height');
    dimension('width', width);
    dimension('height', height);
    // The declaration's hint origin preserves the image's natural-ratio fallback.
    if (tag === 'img' && width && height)
      hints.push({ property: 'aspect-ratio', value: `${width} / ${height}` });
  }
  if (['table', 'col', 'td', 'th'].includes(tag)) {
    dimension('width', nonNegativeAttributeNumber(element, 'width'));
    dimension('height', nonNegativeAttributeNumber(element, 'height'));
  }
  if (tag === 'td' || tag === 'th') {
    let table = element.parentElement;
    while (table && table.tagName.toLowerCase() !== 'table')
      table = table.parentElement;
    const padding = table
      ? nonNegativeAttributeNumber(table, 'cellpadding')
      : undefined;
    if (padding !== undefined)
      hints.push({ property: 'padding', value: `${padding}px` });
  }
  if (
    tag === 'object' &&
    !element.hasAttribute('type') &&
    !element.hasAttribute('data') &&
    Array.from(element.children).some(
      child => child.tagName.toLowerCase() !== 'param',
    )
  ) {
    dimension('width', nonNegativeAttributeNumber(element, 'width'));
    dimension('height', nonNegativeAttributeNumber(element, 'height'));
  }
  if (profile === 'portable') {
    presentation =
      tag === 'input'
        ? (ownDeclarations(
            input,
            (element.getAttribute('type') ?? 'text').toLowerCase(),
          ) ?? input.text)
        : (ownDeclarations(portable, tag) ?? empty);
    if (tag === 'dialog' && !element.hasAttribute('open'))
      presentation = [...presentation, { property: 'display', value: 'none' }];
    if (tag === 'table')
      presentation = declarations({
        'border-spacing': `${nonNegativeAttributeNumber(element, 'cellspacing') ?? 2}px`,
      });
  }
  return {
    userAgent: [...structural, ...presentation],
    presentationalHints: hints,
  };
}

/** Rendering eligibility is an HTML constraint, not an author-overridable default. */
export function suppressesPrincipalBox(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  // Chromium suppresses these even when author CSS requests display:block.
  return (
    (tag === 'input' &&
      (element.getAttribute('type') ?? 'text').toLowerCase() === 'hidden') ||
    (tag === 'audio' && !element.hasAttribute('controls'))
  );
}

function nonNegativeAttributeNumber(
  element: Element,
  attribute: string,
): number | undefined {
  const value = element.getAttribute(attribute);
  if (value === null || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function ownDeclarations(
  rules: Record<string, Declarations>,
  key: string,
): Declarations | undefined {
  return Object.hasOwn(rules, key) ? rules[key] : undefined;
}
