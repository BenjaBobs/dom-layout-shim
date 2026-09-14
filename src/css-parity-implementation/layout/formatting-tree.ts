import type { ResolvedStyles } from '../css/style-resolver.ts';
import type { SupportedStyle } from '../css/supported-style.ts';

export type FormattingKind =
  | 'box'
  | 'inline'
  | 'contents'
  | 'suppressed'
  | 'break'
  | 'table'
  | 'table-caption'
  | 'table-column-group'
  | 'table-column'
  | 'table-section'
  | 'table-row'
  | 'table-cell';

export type FormattingParticipation =
  | Readonly<{ layout: 'none'; geometry: 'none' }>
  | Readonly<{ layout: 'inline'; geometry: 'fragments' }>
  | Readonly<{ layout: 'contents'; geometry: 'none' }>
  | Readonly<{
      layout: 'backend' | 'table' | 'table-part';
      geometry: 'principal';
    }>;

// Adding a kind requires explicit layout and geometry participation. Table
// parts use table allocation when owned by a table and backend fallback otherwise.
const participation: Record<FormattingKind, FormattingParticipation> = {
  box: { layout: 'backend', geometry: 'principal' },
  inline: { layout: 'inline', geometry: 'fragments' },
  contents: { layout: 'contents', geometry: 'none' },
  suppressed: { layout: 'none', geometry: 'none' },
  break: { layout: 'none', geometry: 'none' },
  table: { layout: 'table', geometry: 'principal' },
  'table-caption': { layout: 'table-part', geometry: 'principal' },
  'table-column-group': { layout: 'table-part', geometry: 'principal' },
  'table-column': { layout: 'table-part', geometry: 'principal' },
  'table-section': { layout: 'table-part', geometry: 'principal' },
  'table-row': { layout: 'table-part', geometry: 'principal' },
  'table-cell': { layout: 'table-part', geometry: 'principal' },
};

export type GeneratedFormatting = Readonly<{
  kind: 'generated';
  owner: Element;
  pseudo: 'before' | 'after';
  style: SupportedStyle;
  output: 'none' | 'inline' | 'box';
}>;

export type ElementFormatting = Readonly<{
  kind: FormattingKind;
  participation: FormattingParticipation;
  element: Element;
  style: SupportedStyle;
  children: readonly Element[];
  content: readonly (Element | string)[];
  before: GeneratedFormatting;
  after: GeneratedFormatting;
  textLeaf: boolean;
  hiddenUntilFound: boolean;
  sectionOrder: number;
}>;

export type FormattingTree = Readonly<{
  elements: readonly Element[];
  element(element: Element): ElementFormatting;
}>;

const nonRendered = new Set([
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
const tableKinds: Partial<Record<SupportedStyle['display'], FormattingKind>> = {
  table: 'table',
  'table-caption': 'table-caption',
  'table-column-group': 'table-column-group',
  'table-column': 'table-column',
  'table-header-group': 'table-section',
  'table-row-group': 'table-section',
  'table-footer-group': 'table-section',
  'table-row': 'table-row',
  'table-cell': 'table-cell',
};
// Preserve the engine's HTML table fallback when the UA profile is disabled.
// This compatibility rule belongs here, never in individual table consumers.
const htmlTableKinds: Record<string, FormattingKind> = {
  table: 'table',
  caption: 'table-caption',
  colgroup: 'table-column-group',
  col: 'table-column',
  thead: 'table-section',
  tbody: 'table-section',
  tfoot: 'table-section',
  tr: 'table-row',
  td: 'table-cell',
  th: 'table-cell',
};

/** Resolve participation and DOM order once, before any layout node is built. */
export function createFormattingTree(
  document: Document,
  styles: ResolvedStyles,
): FormattingTree {
  const elements = Array.from(document.getElementsByTagName('*'));
  const records = new Map<Element, ElementFormatting>();
  for (const element of elements) {
    const style = styles.element(element);
    const tag = element.tagName.toLowerCase();
    const hiddenUntilFound =
      element.getAttribute('hidden')?.toLowerCase() === 'until-found';
    const parent = element.parentElement;
    const suppressed =
      records.get(parent as Element)?.kind === 'suppressed' ||
      (parent?.tagName.toLowerCase() === 'details' &&
        !parent.hasAttribute('open') &&
        tag !== 'summary') ||
      nonRendered.has(tag) ||
      style.display === 'none' ||
      (element.hasAttribute('hidden') && !hiddenUntilFound);
    const kind: FormattingKind = suppressed
      ? 'suppressed'
      : tag === 'br'
        ? 'break'
        : style.display === 'contents'
          ? 'contents'
          : style.display === 'inline'
            ? 'inline'
            : (tableKinds[style.display] ?? htmlTableKinds[tag] ?? 'box');
    const generated = (pseudo: 'before' | 'after'): GeneratedFormatting => {
      const value = styles.pseudo(element, pseudo);
      return {
        kind: 'generated',
        owner: element,
        pseudo,
        style: value,
        output:
          suppressed ||
          value.content === undefined ||
          value.display === 'none' ||
          value.display === 'contents'
            ? 'none'
            : value.display === 'inline'
              ? 'inline'
              : 'box',
      };
    };
    const nodes = Array.from(element.childNodes);
    const children = Array.from(element.children);
    if (style.display === 'flex' || style.display === 'grid')
      children.sort(
        (a, b) => styles.element(a).order - styles.element(b).order,
      );
    records.set(element, {
      kind,
      participation: participation[kind],
      element,
      style,
      children,
      content: nodes.flatMap<Element | string>(node =>
        node.nodeType === 3
          ? [node.textContent ?? '']
          : node.nodeType === 1
            ? [node as Element]
            : [],
      ),
      before: generated('before'),
      after: generated('after'),
      textLeaf: nodes.every(
        node =>
          node.nodeType === 3 ||
          node.nodeType === 8 ||
          (node.nodeType === 1 &&
            (node as Element).tagName.toLowerCase() === 'br'),
      ),
      hiddenUntilFound,
      sectionOrder:
        tag === 'thead' || style.display === 'table-header-group'
          ? 0
          : tag === 'tfoot' || style.display === 'table-footer-group'
            ? 2
            : 1,
    });
  }
  return {
    elements,
    element(element) {
      const record = records.get(element);
      if (!record)
        throw new Error('Element is outside the classified formatting tree');
      return record;
    },
  };
}
