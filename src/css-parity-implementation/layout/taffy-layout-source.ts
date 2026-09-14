import type {
  UserAgentStyleOptions,
  Viewport,
} from '../../api/layout-engine-config.ts';
import type { NativeControlMetrics } from '../../api/native-control-profile.ts';
import type { TextMeasurer } from '../../api/text-measurer.ts';
import type { UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts';
import { createStyleResolver } from '../css/style-resolver.ts';
import {
  createRuleMatchingSession,
  type ParsedStylesheet,
  readCssTextRules,
  readStyleRules,
  type StyleRule,
  type StylesheetParseCache,
} from '../css/stylesheet-source.ts';
import {
  type Edges,
  type SupportedStyle,
  zeroEdges,
} from '../css/supported-style.ts';
import { boxMetrics } from './box-metrics.ts';
import {
  collectionState,
  collectTaffyLayoutSnapshot,
} from './collect-layout.ts';
import { percentageBasis } from './containing-block.ts';
import { FormattingPlan } from './formatting-plan.ts';
import { createFormattingTree } from './formatting-tree.ts';
import {
  createInlineFormatter,
  type InlineLayout,
  type InlineRun,
} from './inline-formatting.ts';
import {
  containingBlockEnvironment,
  containingBlockFor,
  markElementNoBox,
  markSubtreeDisplayNone,
  markSubtreeNoBox,
  renderedElementChildren,
  resolvePseudoElementStyle,
  resolveSupportedStyle,
} from './layout-context.ts';
import { createLayoutGeometry } from './layout-geometry.ts';
import type { LayoutSnapshot, ScrollOffset } from './layout-source.ts';
import type {
  CompletedLayout,
  LayoutReadState,
  SimpleTableCellLayout,
  SimpleTableColumnGroupLayout,
  SimpleTableLayout,
  SimpleTableRowLayout,
  SimpleTableSectionLayout,
  TaffyLayoutState,
} from './layout-state.ts';
import { hasCalculatedDimension } from './length-dependencies.ts';
import { effectiveBorderWidth } from './resolved-border.ts';
import { type Layout, loadTaffy, TaffyTree } from './taffy/taffy-bindings.ts';
import {
  createMeasureContext,
  type MeasureContext,
} from './taffy/taffy-measure.ts';

type TaffyLayoutTree = {
  root: bigint;
  state: TaffyLayoutState;
};

export type LayoutStylesheetCache = {
  layout?: CompletedLayout;
  parsedSources?: StylesheetParseCache;
  parsedUserAgent?: ParsedStylesheet;
  documentKey?: string;
  documentRules?: StyleRule[];
  userAgentKey?: string;
  userAgentRules?: StyleRule[];
};

type SimpleTableCellInput = {
  element: Element;
  colSpan: number;
  rowSpan: number;
};

type SimpleTableCellPlacement = SimpleTableCellInput & {
  columnIndex: number;
  rowIndex: number;
};

type SimpleTableColumnInput = {
  element: Element;
  span: number;
};

type SimpleTableColumnPlacement = SimpleTableColumnInput & {
  columnIndex: number;
};

type SimpleTableSpanConstraint = {
  startIndex: number;
  span: number;
  size: number;
};

type SimpleTableRowSpanConstraint = {
  startIndex: number;
  span: number;
  size: number;
};

let taffyLoadPromise: Promise<unknown> | undefined;

export async function loadTaffyBackend(): Promise<void> {
  taffyLoadPromise ??= loadTaffy();
  await taffyLoadPromise;
}

export function computeTaffyDocumentLayout(
  document: Document,
  viewport: Viewport,
  scroll: ScrollOffset,
  policy: UnsupportedCssPolicy | undefined,
  textMeasurer: TextMeasurer,
  stylesheets: readonly string[],
  userAgentStyles: Required<UserAgentStyleOptions>,
  nativeControlMetrics: NativeControlMetrics,
  stylesheetCache?: LayoutStylesheetCache,
  stylesheetFingerprint = '',
): LayoutSnapshot {
  const layoutTree = buildTaffyLayoutTree(
    document,
    viewport,
    policy,
    textMeasurer,
    stylesheets,
    userAgentStyles,
    nativeControlMetrics,
    stylesheetCache,
    stylesheetFingerprint,
  );
  computeTaffyLayout(layoutTree, viewport);
  const layout = completeLayout(document, layoutTree.state);
  if (stylesheetCache) stylesheetCache.layout = layout;
  return collectTaffyLayoutSnapshot(
    document,
    viewport,
    scroll,
    collectionState(layout),
  );
}

export function reprojectTaffyDocumentLayout(
  document: Document,
  viewport: Viewport,
  scroll: ScrollOffset,
  cache: LayoutStylesheetCache,
): LayoutSnapshot | undefined {
  return cache.layout
    ? collectTaffyLayoutSnapshot(
        document,
        viewport,
        scroll,
        collectionState(cache.layout),
      )
    : undefined;
}

function completeLayout(
  document: Document,
  state: TaffyLayoutState,
): CompletedLayout {
  const layouts = new Map<bigint, Layout>();
  const getLayout = (node: bigint): Layout => {
    const cached = layouts.get(node);
    if (cached) return cached;
    const result = state.tree.getLayout(node);
    layouts.set(node, result);
    return result;
  };
  for (const node of state.elementNodes.values()) getLayout(node);
  for (const context of state.inlineContexts) getLayout(context.node);
  const inlineContexts = state.inlineContexts.map(context => {
    const layout = getLayout(context.node);
    const metrics = boxMetrics(layout, layout);
    return {
      host: context.host,
      node: context.node,
      anonymous: context.anonymous,
      result: context.format(
        context.anonymous ? layout.width : metrics.content.width,
      ),
    };
  });
  return {
    phase: 'completed',
    formatting: state.formatting,
    elementNodes: state.elementNodes,
    contentsElements: state.contentsElements,
    tableLayouts: state.tableLayouts,
    cellFormatting: state.cellFormatting,
    styleResolver: state.styleResolver.complete(
      Array.from(document.getElementsByTagName('*')),
    ),
    tree: {
      getLayout(node) {
        const layout = layouts.get(node);
        if (!layout)
          throw new Error(
            'Snapshot requested a backend node outside the completed layout',
          );
        return layout;
      },
    },
    viewport: state.viewport,
    noBoxElements: new Set(state.geometry.rects.keys()),
    textOverflowElements: new Set(
      [...state.elementNodes.keys()].filter(
        element =>
          state.formatting.element(element).textLeaf ||
          hasGeneratedPseudoBox(element, state),
      ),
    ),
    inlineContexts,
  };
}

function buildTaffyLayoutTree(
  document: Document,
  viewport: Viewport,
  policy: UnsupportedCssPolicy | undefined,
  textMeasurer: TextMeasurer,
  stylesheets: readonly string[],
  userAgentStyles: Required<UserAgentStyleOptions>,
  nativeControlMetrics: NativeControlMetrics,
  stylesheetCache: LayoutStylesheetCache | undefined,
  stylesheetFingerprint: string,
): TaffyLayoutTree {
  const tree = new TaffyTree();
  // Taffy's JS wrapper enables whole-pixel rounding by default, while DOM
  // geometry APIs preserve CSS subpixels. Keep raw Taffy values so flex
  // distribution and fractional UA metrics match browser-observable boxes.
  tree.disableRounding();
  const styleResolver = createStyleResolver({
    rules: createRuleMatchingSession(
      cachedDocumentRules(
        document,
        policy,
        stylesheets,
        viewport,
        stylesheetFingerprint,
        stylesheetCache,
      ),
    ),
    userAgentRules: createRuleMatchingSession(
      cachedUserAgentRules(
        userAgentStyles.overrides,
        policy,
        viewport,
        stylesheetCache,
      ),
    ),
    profile: userAgentStyles.profile,
    policy,
    viewport,
  });
  const state: TaffyLayoutState = {
    phase: 'building',
    plan: new FormattingPlan(tree),
    geometry: createLayoutGeometry(),
    elementNodes: new Map<Element, bigint>(),
    outOfFlowNodes: new Map(),
    measureContexts: new Map(),
    inlineContexts: [],
    contentsElements: new Set<Element>(),
    tableLayouts: new Map<Element, SimpleTableLayout>(),
    cellFormatting: new Map(),
    tree,
    styleResolver,
    formatting: createFormattingTree(document, styleResolver),
    textMeasurer,
    nativeControlMetrics,
    viewport,
    domOrder: 0,
    paintOrders: new WeakMap<Element, number>(),
  };

  const root = state.plan.viewport(
    buildChildNodes(document.body, state),
    viewport,
  );

  return { root, state };
}

function cachedDocumentRules(
  document: Document,
  policy: UnsupportedCssPolicy | undefined,
  stylesheets: readonly string[],
  viewport: Viewport,
  stylesheetFingerprint: string,
  cache: LayoutStylesheetCache | undefined,
): StyleRule[] {
  const key = `${viewport.width}:${viewport.height}:${stylesheetFingerprint}`;
  if (cache?.documentKey === key && cache.documentRules) {
    return cache.documentRules;
  }

  if (cache && !cache.parsedSources)
    cache.parsedSources = { sources: new WeakMap(), configured: new Map() };
  const rules = readStyleRules(
    document,
    policy,
    stylesheets,
    viewport,
    cache?.parsedSources,
  );
  if (cache) {
    cache.documentKey = key;
    cache.documentRules = rules;
  }
  return rules;
}

function cachedUserAgentRules(
  overrides: string | undefined,
  policy: UnsupportedCssPolicy | undefined,
  viewport: Viewport,
  cache: LayoutStylesheetCache | undefined,
): StyleRule[] {
  if (!overrides) return [];

  const key = `${viewport.width}:${viewport.height}`;
  if (cache?.userAgentKey === key && cache.userAgentRules) {
    return cache.userAgentRules;
  }

  if (cache && !cache.parsedUserAgent) cache.parsedUserAgent = {};
  const rules = readCssTextRules(
    overrides,
    'user-agent-overrides.css',
    policy,
    viewport,
    cache?.parsedUserAgent,
  );
  if (cache) {
    cache.userAgentKey = key;
    cache.userAgentRules = rules;
  }
  return rules;
}

function computeTaffyLayout(
  layoutTree: TaffyLayoutTree,
  viewport: Viewport,
): void {
  computeFormattingRoot(
    layoutTree.root,
    { width: viewport.width, height: viewport.height },
    layoutTree.state,
  );
}

function computeFormattingRoot(
  node: bigint,
  available: { width: number | 'max-content'; height: number | 'max-content' },
  state: TaffyLayoutState,
): void {
  state.plan.compute(node, available, entry => {
    if (!entry.style || entry.source.kind === 'viewport') return {};
    const source = entry.source;
    const owner = source.kind === 'element' ? source.element : source.owner;
    // Generated and anonymous inline boxes are children of their originating
    // element. Table-cell roots represent that element's allocated box itself.
    const subject =
      source.kind === 'generated' ||
      (source.kind === 'anonymous' && source.role === 'inline')
        ? { parentElement: owner, ownerDocument: owner.ownerDocument }
        : owner;
    const environment = containingBlockEnvironment(state, true);
    return percentageBasis(subject, entry.style, {
      ...environment,
      style: element =>
        state.cellFormatting.get(element)?.style ?? environment.style(element),
    });
  });
}

function percentageBasisFor(
  element: Element,
  style: SupportedStyle,
  state: TaffyLayoutState,
  measured = false,
): { width?: number; height?: number } {
  // Native scalar/percentage dimensions need no adapter basis; only mixed
  // calculations and intrinsic replaced sizing consume it at this boundary.
  if (
    !hasCalculatedDimension(style) &&
    !state.measureContexts.get(element)?.intrinsicReplaced
  )
    return {};
  return percentageBasis(
    element,
    style,
    containingBlockEnvironment(state, measured),
  );
}

function inlineRunsFor(
  element: Element,
  state: TaffyLayoutState,
  owners: readonly Element[] = [],
): InlineRun[] {
  const style = resolveSupportedStyle(element, state);
  const runs: InlineRun[] = [];
  const pseudo = (which: 'before' | 'after') => {
    const generated = state.formatting.element(element)[which];
    const pseudoStyle = generated.style;
    if (generated.output === 'inline' && pseudoStyle.content !== undefined)
      runs.push({ text: pseudoStyle.content, style: pseudoStyle, owners });
  };
  pseudo('before');
  for (const node of state.formatting.element(element).content) {
    if (typeof node === 'string') {
      const text =
        style.whiteSpace === 'normal' || style.whiteSpace === 'nowrap'
          ? node.replace(/\s/g, ' ')
          : node;
      runs.push({ text, style, owners });
    } else {
      const child = node;
      const childStyle = resolveSupportedStyle(child, state);
      if (state.formatting.element(child).kind === 'suppressed') continue;
      if (state.formatting.element(child).kind === 'break')
        runs.push({ text: '\n', style, owners });
      else if (
        childStyle.display === 'inline' ||
        childStyle.display === 'contents'
      ) {
        markElementNoBox(child, state);
        runs.push(
          ...inlineRunsFor(
            child,
            state,
            childStyle.display === 'inline' ? [...owners, child] : owners,
          ),
        );
      }
    }
  }
  pseudo('after');
  return runs;
}

function inlineMeasureContext(
  runs: readonly InlineRun[],
  style: SupportedStyle,
  state: TaffyLayoutState,
): { context: MeasureContext; format: (width: number) => InlineLayout } {
  const format = createInlineFormatter(runs, style, state.textMeasurer);
  return {
    format,
    context: {
      ...style,
      text: runs.map(run => run.text).join(''),
      textMeasurer: {
        measure: input => format(input.maxWidth ?? Number.MAX_SAFE_INTEGER),
      },
    },
  };
}

function buildChildNodes(
  parent: Element | null,
  state: TaffyLayoutState,
): bigint[] {
  if (!parent) {
    return [];
  }

  const children = renderedElementChildren(parent, state);
  const renderedChildren = new Set(children);
  const parentStyle = resolveSupportedStyle(parent, state);
  if (parentStyle.display === 'flex' || parentStyle.display === 'grid') {
    const items = [
      generatedPseudoItem(parent, 'before', -1, state),
      ...children.map((element, index) => ({
        nodes: buildNodesForElement(element, state),
        order: resolveSupportedStyle(element, state).order,
        sequence: index,
      })),
      generatedPseudoItem(parent, 'after', children.length, state),
    ].filter(item => item.nodes.length > 0);

    return items
      .toSorted((a, b) => a.order - b.order || a.sequence - b.sequence)
      .flatMap(item => item.nodes)
      .concat(state.outOfFlowNodes.get(parent) ?? []);
  }
  const nodes: bigint[] = [];
  let runs: InlineRun[] = [];
  const flush = () => {
    if (!runs.some(run => run.text.trim())) {
      runs = [];
      return;
    }
    const anonymousStyle = state.styleResolver.anonymous(parentStyle);
    const { context, format } = inlineMeasureContext(
      runs,
      anonymousStyle,
      state,
    );
    const node = state.plan.create({
      source: { kind: 'anonymous', owner: parent, role: 'inline' },
      style: anonymousStyle,
      context,
      measure: context,
    });
    nodes.push(node);
    state.inlineContexts.push({ host: parent, node, anonymous: true, format });
    runs = [];
  };
  const pseudo = (which: 'before' | 'after') => {
    const generated = state.formatting.element(parent)[which];
    const style = generated.style;
    if (generated.output === 'inline' && style.content !== undefined)
      runs.push({ text: style.content, style, owners: [] });
    else {
      flush();
      nodes.push(...buildGeneratedPseudoNodes(parent, which, state));
    }
  };
  pseudo('before');
  for (const node of state.formatting.element(parent).content) {
    if (typeof node === 'string') {
      runs.push({
        text:
          parentStyle.whiteSpace === 'normal' ||
          parentStyle.whiteSpace === 'nowrap'
            ? node.replace(/\s/g, ' ')
            : node,
        style: parentStyle,
        owners: [],
      });
      continue;
    }
    const element = node;
    if (!renderedChildren.has(element)) continue;
    const style = resolveSupportedStyle(element, state);
    if (state.formatting.element(element).kind === 'suppressed') {
      markSubtreeDisplayNone(element, state);
      continue;
    }
    if (state.formatting.element(element).kind === 'break')
      runs.push({ text: '\n', style: parentStyle, owners: [] });
    else if (style.display === 'inline') {
      markElementNoBox(element, state);
      runs.push(...inlineRunsFor(element, state, [element]));
    } else {
      flush();
      nodes.push(...buildNodesForElement(element, state));
    }
  }
  flush();
  pseudo('after');
  flush();
  return nodes.concat(state.outOfFlowNodes.get(parent) ?? []);
}

function buildNodesForElement(
  element: Element,
  state: TaffyLayoutState,
): bigint[] {
  const nodes = buildElementFormattingNodes(element, state);
  const style = resolveSupportedStyle(element, state);
  if (style.position !== 'absolute' && style.position !== 'fixed') return nodes;
  const parent =
    containingBlockFor(element, style, state) ?? element.ownerDocument.body;
  if (parent === element.parentElement) return nodes;
  // Taffy positions against its tree parent. Hoist out-of-flow nodes to their
  // CSS containing block while retaining DOM ancestry for clipping and paint.
  const pending = state.outOfFlowNodes.get(parent) ?? [];
  pending.push(...nodes);
  state.outOfFlowNodes.set(parent, pending);
  return [];
}

function buildElementFormattingNodes(
  element: Element,
  state: TaffyLayoutState,
): bigint[] {
  const style = resolveSupportedStyle(element, state);

  if (state.formatting.element(element).kind === 'suppressed') {
    markSubtreeDisplayNone(element, state);
    return [];
  }

  if (state.formatting.element(element).kind === 'break') {
    markElementNoBox(element, state);
    return [];
  }

  if (style.display === 'inline') {
    // Inline content is owned by its host formatter, not a principal backend node.
    markSubtreeNoBox(element, state);
    return [];
  }

  if (style.display === 'contents') {
    // display: contents removes the element's own principal box while its
    // children participate in the parent's Taffy formatting context.
    markElementNoBox(element, state);
    state.contentsElements.add(element);
    return buildChildNodes(element, state);
  }

  const tableLayout = createSimpleTableLayout(element, state);
  if (tableLayout) {
    state.tableLayouts.set(element, tableLayout);
    const context = createReplacedMeasureContext(
      style,
      tableLayout.width,
      tableLayout.height,
      state.textMeasurer,
    );
    const node = state.plan.create({
      source: { kind: 'element', element },
      style,
      context: {
        ...context,
        percentageBasis: percentageBasisFor(element, style, state),
      },
      measure: context,
    });
    state.elementNodes.set(element, node);
    return [node];
  }

  const generatedContent = {
    before: resolvePseudoElementStyle(element, 'before', state).content ?? '',
    after: resolvePseudoElementStyle(element, 'after', state).content ?? '',
  };
  for (const pseudoElement of ['before', 'after'] as const) {
    if (
      generatedContent[pseudoElement] &&
      resolvePseudoElementStyle(element, pseudoElement, state).display !==
        'inline'
    ) {
      generatedContent[pseudoElement] = '';
    }
  }
  let context = createMeasureContext(
    element,
    style,
    state.textMeasurer,
    state.nativeControlMetrics,
    generatedContent,
  );
  const inlineOnly =
    !context?.replacedSize &&
    !context?.intrinsicReplaced &&
    style.display !== 'flex' &&
    style.display !== 'grid' &&
    !hasGeneratedPseudoBox(element, state) &&
    renderedElementChildren(element, state).every(
      child =>
        ['inline', 'none', 'contents'].includes(
          resolveSupportedStyle(child, state).display,
        ) || child.tagName.toLowerCase() === 'br',
    );
  let inlineFormat: ((width: number) => InlineLayout) | undefined;
  if (
    inlineOnly &&
    (element.children.length > 0 ||
      generatedContent.before ||
      generatedContent.after)
  ) {
    const formatted = inlineMeasureContext(
      inlineRunsFor(element, state),
      style,
      state,
    );
    context = formatted.context;
    inlineFormat = formatted.format;
  }
  if (context) {
    let parent = element.parentElement;
    while (
      parent &&
      resolveSupportedStyle(parent, state).display === 'contents'
    )
      parent = parent.parentElement;
    context.isFlexItem =
      !!parent &&
      resolveSupportedStyle(parent, state).display === 'flex' &&
      style.position !== 'absolute' &&
      style.position !== 'fixed';
    state.measureContexts.set(element, context);
  }
  const hasPseudoBox = hasGeneratedPseudoBox(element, state);
  const children =
    context?.replacedSize ||
    inlineFormat ||
    (state.formatting.element(element).textLeaf && !hasPseudoBox)
      ? []
      : buildChildNodes(element, state);
  const measuredLeaf =
    children.length === 0 &&
    context &&
    (state.formatting.element(element).textLeaf ||
      inlineFormat ||
      context.replacedSize ||
      context.intrinsicReplaced);
  const node = state.plan.create({
    source: { kind: 'element', element },
    style,
    children,
    context: {
      ...context,
      percentageBasis: percentageBasisFor(element, style, state),
    },
    measure: measuredLeaf ? context : undefined,
  });

  if (inlineFormat)
    state.inlineContexts.push({
      host: element,
      node,
      anonymous: false,
      format: inlineFormat,
    });
  state.elementNodes.set(element, node);
  return [node];
}

function generatedPseudoItem(
  element: Element,
  pseudoElement: 'before' | 'after',
  sequence: number,
  state: TaffyLayoutState,
): { nodes: bigint[]; order: number; sequence: number } {
  const style = resolvePseudoElementStyle(element, pseudoElement, state);
  return {
    nodes: buildGeneratedPseudoNodes(element, pseudoElement, state),
    order: style.order,
    sequence,
  };
}

function hasGeneratedPseudoBox(
  element: Element,
  state: LayoutReadState,
): boolean {
  const record = state.formatting.element(element);
  return record.before.output === 'box' || record.after.output === 'box';
}

function buildGeneratedPseudoNodes(
  element: Element,
  pseudoElement: 'before' | 'after',
  state: TaffyLayoutState,
): bigint[] {
  const content = resolvePseudoElementStyle(
    element,
    pseudoElement,
    state,
  ).content;
  if (
    content === undefined ||
    state.formatting.element(element)[pseudoElement].output !== 'box'
  )
    return [];

  const style = resolvePseudoElementStyle(element, pseudoElement, state);

  // Generated boxes have no DOM node to attach to. Keep them as anonymous
  // Taffy leaves: they affect their originating element's formatting context,
  // while DOM geometry and hit testing continue to expose real elements only.
  const context: MeasureContext = {
    text: content,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    wordSpacing: style.wordSpacing,
    lineHeight: style.lineHeight,
    whiteSpace: style.whiteSpace,
    textTransform: style.textTransform,
    textMeasurer: state.textMeasurer,
  };
  return [
    state.plan.create({
      source: { kind: 'generated', owner: element, pseudo: pseudoElement },
      style,
      context,
      measure: context,
    }),
  ];
}

function buildTableCellFormatting(
  element: Element,
  style: SupportedStyle,
  state: TaffyLayoutState,
): { width: number; height: number } | undefined {
  if (!element.childNodes.length) return undefined;
  const children = buildChildNodes(element, state);
  if (!children.length) return undefined;
  const formattingStyle: SupportedStyle = {
    ...style,
    display: 'block',
    position: 'static',
    height: undefined,
    minHeight: undefined,
    maxHeight: undefined,
    margin: zeroEdges(),
  };
  const node = state.plan.create({
    source: { kind: 'anonymous', owner: element, role: 'table-cell' },
    style: formattingStyle,
    children,
  });
  state.cellFormatting.set(element, { node, style: formattingStyle });
  state.elementNodes.set(element, node);
  computeFormattingRoot(
    node,
    { width: 'max-content', height: 'max-content' },
    state,
  );
  return state.tree.getLayout(node);
}

function createSimpleTableLayout(
  element: Element,
  state: TaffyLayoutState,
): SimpleTableLayout | undefined {
  if (!isTableElement(element, state)) {
    return undefined;
  }

  const sections = tableSectionElements(element, state);
  const rowElements = sections.map(section => tableRowElements(section, state));
  const rowCells = rowElements.map(rows =>
    rows.map(row => tableCellInputs(row, state)),
  );
  const rowPlacements = rowCells.map(createTableCellPlacements);
  const columnGroups = tableColumnGroups(element, state);
  const columnPlacements = columnGroups.map(group =>
    tableColumnPlacements(group, state),
  );
  const tableColumnCount = Math.max(
    0,
    ...columnPlacements.flatMap(columns =>
      columns.map(column => column.columnIndex + column.span),
    ),
  );
  const rowColumnCount = Math.max(
    0,
    ...rowPlacements.flatMap(rows =>
      rows.flatMap(cells => cells.map(cell => cell.columnIndex + cell.colSpan)),
    ),
  );
  const columnCount = Math.max(tableColumnCount, rowColumnCount);

  if (sections.length === 0 || columnCount === 0) {
    return undefined;
  }

  const columnWidths = Array.from({ length: columnCount }, () => 0);
  const rowHeights = rowElements.map(rows => rows.map(() => 0));
  const collapsedColumns = tableCollapsedColumns(
    columnPlacements,
    columnCount,
    state,
  );
  const collapsedRows = rowElements.map((rows, sectionIndex) =>
    rows.map(row => {
      const sectionStyle = resolveSupportedStyle(sections[sectionIndex], state);
      const rowStyle = resolveSupportedStyle(row, state);
      return (
        sectionStyle.visibility === 'collapse' ||
        rowStyle.visibility === 'collapse'
      );
    }),
  );
  const columnSpanConstraints: SimpleTableSpanConstraint[] = [];
  const rowSpanConstraints = rowElements.map(
    (): SimpleTableRowSpanConstraint[] => [],
  );
  const tableStyle = resolveSupportedStyle(element, state);
  const isCollapsedBorderTable = tableStyle.borderCollapse === 'collapse';
  const horizontalSpacing = isCollapsedBorderTable
    ? 0
    : tableStyle.tableBorderSpacing.horizontal;
  const verticalSpacing = isCollapsedBorderTable
    ? 0
    : tableStyle.tableBorderSpacing.vertical;
  const collapsedBorderInset = isCollapsedBorderTable
    ? tableCollapsedBorderInset(rowPlacements, state)
    : zeroEdges();
  const captionElement = tableCaptionElement(element, state);
  const captionStyle = captionElement
    ? resolveSupportedStyle(captionElement, state)
    : undefined;
  const captionWidth = captionStyle ? tableCaptionOuterWidth(captionStyle) : 0;
  const captionHeight = captionStyle
    ? tableCaptionOuterHeight(captionStyle)
    : 0;
  const captionSide = captionStyle?.captionSide ?? tableStyle.captionSide;

  for (const columns of columnPlacements) {
    for (const column of columns) {
      const columnStyle = resolveSupportedStyle(column.element, state);
      const columnWidth = numericDimension(columnStyle.width);

      for (let offset = 0; offset < column.span; offset += 1) {
        columnWidths[column.columnIndex + offset] = Math.max(
          columnWidths[column.columnIndex + offset],
          columnWidth,
        );
      }
    }
  }

  for (const [sectionIndex, rows] of rowElements.entries()) {
    for (const rowIndex of rows.keys()) {
      for (const cell of rowPlacements[sectionIndex][rowIndex]) {
        const cellStyle = resolveSupportedStyle(cell.element, state);
        const cellSize = tableCellOuterSize(cellStyle, isCollapsedBorderTable);
        const content = buildTableCellFormatting(
          cell.element,
          cellStyle,
          state,
        );
        if (content) {
          cellSize.width = Math.max(cellSize.width, content.width);
          cellSize.height = Math.max(cellSize.height, content.height);
        }
        if (cell.colSpan === 1) {
          columnWidths[cell.columnIndex] = Math.max(
            columnWidths[cell.columnIndex],
            cellSize.width,
          );
        } else {
          columnSpanConstraints.push({
            startIndex: cell.columnIndex,
            span: cell.colSpan,
            size: cellSize.width,
          });
        }
        if (cell.rowSpan === 1) {
          rowHeights[sectionIndex][rowIndex] = Math.max(
            rowHeights[sectionIndex][rowIndex],
            cellSize.height,
          );
        } else {
          rowSpanConstraints[sectionIndex].push({
            startIndex: rowIndex,
            span: cell.rowSpan,
            size: cellSize.height,
          });
        }
      }
    }
  }

  applyTableSpanConstraints(
    columnWidths,
    columnSpanConstraints,
    horizontalSpacing,
  );
  applyExplicitTableWidth(
    columnWidths,
    Math.max(numericDimension(tableStyle.width), captionWidth),
    horizontalSpacing,
  );
  for (const [index, collapsed] of collapsedColumns.entries()) {
    if (collapsed) {
      columnWidths[index] = 0;
    }
  }
  // Once columns are allocated, the ordinary formatting pipeline reflows each
  // cell at its actual width. Wrapped content then contributes row constraints.
  for (const [sectionIndex, rows] of rowPlacements.entries()) {
    for (const [rowIndex, cells] of rows.entries()) {
      for (const cell of cells) {
        const formatting = state.cellFormatting.get(cell.element);
        if (!formatting) continue;
        const width = spannedTracksSize(
          columnWidths,
          cell.columnIndex,
          cell.colSpan,
          horizontalSpacing,
        );
        const style = {
          ...formatting.style,
          width,
          boxSizing: 'border-box' as const,
        };
        formatting.style = style;
        state.plan.updateStyle(formatting.node, style);
        computeFormattingRoot(
          formatting.node,
          { width, height: 'max-content' },
          state,
        );
        const height = state.tree.getLayout(formatting.node).height;
        if (cell.rowSpan === 1)
          rowHeights[sectionIndex][rowIndex] = Math.max(
            rowHeights[sectionIndex][rowIndex],
            height,
          );
        else
          rowSpanConstraints[sectionIndex].push({
            startIndex: rowIndex,
            span: cell.rowSpan,
            size: height,
          });
      }
    }
  }
  for (const [sectionIndex, constraints] of rowSpanConstraints.entries()) {
    applyTableSpanConstraints(
      rowHeights[sectionIndex],
      constraints,
      verticalSpacing,
    );
  }
  for (const [sectionIndex, rows] of collapsedRows.entries()) {
    for (const [rowIndex, collapsed] of rows.entries()) {
      if (collapsed) {
        rowHeights[sectionIndex][rowIndex] = 0;
      }
    }
  }

  applyExplicitTableHeight(
    rowHeights,
    numericDimension(tableStyle.height),
    captionHeight,
    verticalSpacing,
  );
  const tableWidth =
    columnWidths.reduce((sum, width) => sum + width, 0) +
    (isCollapsedBorderTable
      ? horizontal(collapsedBorderInset)
      : horizontalSpacing * (columnCount + 1));
  const leadingX = isCollapsedBorderTable
    ? collapsedBorderInset.left
    : horizontalSpacing;
  const leadingY = isCollapsedBorderTable
    ? collapsedBorderInset.top
    : verticalSpacing;
  const trailingY = isCollapsedBorderTable ? collapsedBorderInset.bottom : 0;
  let y = (captionSide === 'top' ? captionHeight : 0) + leadingY;
  const sectionLayouts: SimpleTableSectionLayout[] = [];

  for (const [sectionIndex, section] of sections.entries()) {
    const rows = rowElements[sectionIndex];
    const sectionY = y;
    const rowLayouts: SimpleTableRowLayout[] = [];

    for (const [rowIndex, row] of rows.entries()) {
      const rowHeight = rowHeights[sectionIndex][rowIndex];
      const cellLayouts: SimpleTableCellLayout[] = [];

      for (const cell of rowPlacements[sectionIndex][rowIndex]) {
        const x = tableTrackOffset(
          columnWidths,
          cell.columnIndex,
          horizontalSpacing,
          leadingX,
        );
        const width = spannedTracksSize(
          columnWidths,
          cell.columnIndex,
          cell.colSpan,
          horizontalSpacing,
        );
        const height = spannedTracksSize(
          rowHeights[sectionIndex],
          rowIndex,
          cell.rowSpan,
          verticalSpacing,
        );
        cellLayouts.push({ element: cell.element, x, y, width, height });
      }

      rowLayouts.push({
        element: row,
        x: leadingX,
        y,
        width:
          tableWidth -
          horizontal(collapsedBorderInset) -
          horizontalSpacing * (isCollapsedBorderTable ? 0 : 2),
        height: rowHeight,
        cells: cellLayouts,
      });
      y += rowHeight + verticalSpacing;
    }

    sectionLayouts.push({
      element: section === element ? undefined : section,
      x: leadingX,
      y: sectionY,
      width:
        tableWidth -
        horizontal(collapsedBorderInset) -
        horizontalSpacing * (isCollapsedBorderTable ? 0 : 2),
      height: y - sectionY - verticalSpacing,
      rows: rowLayouts,
    });
  }
  const tableLayoutBottom = y + trailingY;
  const tableBodyTop = (captionSide === 'top' ? captionHeight : 0) + leadingY;
  const tableBodyHeight = y - tableBodyTop;
  const columnGroupLayouts = columnGroups.map(
    (group, groupIndex): SimpleTableColumnGroupLayout => {
      const columns = columnPlacements[groupIndex];
      const startColumn = Math.min(
        ...columns.map(column => column.columnIndex),
      );
      const endColumn = Math.max(
        ...columns.map(column => column.columnIndex + column.span),
      );
      const x = tableTrackOffset(
        columnWidths,
        startColumn,
        horizontalSpacing,
        leadingX,
      );
      const width = spannedTracksSize(
        columnWidths,
        startColumn,
        endColumn - startColumn,
        horizontalSpacing,
      );

      return {
        element: group,
        x,
        y: tableBodyTop,
        width,
        height: tableBodyHeight,
        columns: columns.map(column => ({
          element: column.element,
          x: tableTrackOffset(
            columnWidths,
            column.columnIndex,
            horizontalSpacing,
            leadingX,
          ),
          y: tableBodyTop,
          width: spannedTracksSize(
            columnWidths,
            column.columnIndex,
            column.span,
            horizontalSpacing,
          ),
          height: tableColumnIsCollapsed(
            collapsedColumns,
            column.columnIndex,
            column.span,
          )
            ? 0
            : tableBodyHeight,
        })),
      };
    },
  );

  return {
    width: tableWidth,
    height: tableLayoutBottom + (captionSide === 'bottom' ? captionHeight : 0),
    caption: captionElement
      ? {
          element: captionElement,
          x: 0,
          y: captionSide === 'bottom' ? tableLayoutBottom : 0,
          width: tableWidth,
          height: captionHeight,
        }
      : undefined,
    columnGroups: columnGroupLayouts,
    sections: sectionLayouts,
  };
}

function isTableElement(element: Element, state: TaffyLayoutState): boolean {
  return state.formatting.element(element).kind === 'table';
}

function isTableCaptionElement(
  element: Element,
  state: TaffyLayoutState,
): boolean {
  return state.formatting.element(element).kind === 'table-caption';
}

function isTableColumnGroupElement(
  element: Element,
  state: TaffyLayoutState,
): boolean {
  return state.formatting.element(element).kind === 'table-column-group';
}

function isTableColumnElement(
  element: Element,
  state: TaffyLayoutState,
): boolean {
  return state.formatting.element(element).kind === 'table-column';
}

function isTableSectionElement(
  element: Element,
  state: TaffyLayoutState,
): boolean {
  return state.formatting.element(element).kind === 'table-section';
}

function isTableRowElement(element: Element, state: TaffyLayoutState): boolean {
  return state.formatting.element(element).kind === 'table-row';
}

function isTableCellElement(
  element: Element,
  state: TaffyLayoutState,
): boolean {
  return state.formatting.element(element).kind === 'table-cell';
}

function tableCaptionElement(
  table: Element,
  state: TaffyLayoutState,
): Element | undefined {
  return [...state.formatting.element(table).children].find(child =>
    isTableCaptionElement(child, state),
  );
}

function tableColumnGroups(table: Element, state: TaffyLayoutState): Element[] {
  return [...state.formatting.element(table).children].filter(
    child =>
      isTableColumnGroupElement(child, state) &&
      tableColumnElements(child, state).length > 0,
  );
}

function tableColumnElements(
  columnGroup: Element,
  state: TaffyLayoutState,
): Element[] {
  return [...state.formatting.element(columnGroup).children].filter(child =>
    isTableColumnElement(child, state),
  );
}

function tableColumnPlacements(
  columnGroup: Element,
  state: TaffyLayoutState,
): SimpleTableColumnPlacement[] {
  let columnIndex = 0;

  return tableColumnElements(columnGroup, state).map(element => {
    const span = tableColumnElementSpan(element);
    const placement = { element, span, columnIndex };
    columnIndex += span;
    return placement;
  });
}

function tableCollapsedColumns(
  columnPlacements: SimpleTableColumnPlacement[][],
  columnCount: number,
  state: TaffyLayoutState,
): boolean[] {
  const collapsed = Array.from({ length: columnCount }, () => false);

  for (const columns of columnPlacements) {
    for (const column of columns) {
      const columnStyle = resolveSupportedStyle(column.element, state);
      const parentStyle = column.element.parentElement
        ? resolveSupportedStyle(column.element.parentElement, state)
        : undefined;

      if (
        columnStyle.visibility !== 'collapse' &&
        parentStyle?.visibility !== 'collapse'
      ) {
        continue;
      }

      for (let offset = 0; offset < column.span; offset += 1) {
        collapsed[column.columnIndex + offset] = true;
      }
    }
  }

  return collapsed;
}

function tableColumnIsCollapsed(
  collapsedColumns: boolean[],
  columnIndex: number,
  span: number,
): boolean {
  return collapsedColumns
    .slice(columnIndex, columnIndex + span)
    .every(collapsed => collapsed);
}

function tableColumnElementSpan(column: Element): number {
  const attr = column.getAttribute('span');

  if (!attr) {
    return 1;
  }

  const value = Number(attr);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 1000) : 1;
}

function tableSectionElements(
  table: Element,
  state: TaffyLayoutState,
): Element[] {
  const sections = [...state.formatting.element(table).children].filter(child =>
    isTableSectionElement(child, state),
  );

  return sections.length > 0
    ? sections.sort(
        (a, b) => tableSectionOrder(a, state) - tableSectionOrder(b, state),
      )
    : [table];
}

function tableSectionOrder(section: Element, state: TaffyLayoutState): number {
  return state.formatting.element(section).sectionOrder;
}

function tableRowElements(
  section: Element,
  state: TaffyLayoutState,
): Element[] {
  return [...state.formatting.element(section).children].filter(child =>
    isTableRowElement(child, state),
  );
}

function tableCellElements(row: Element, state: TaffyLayoutState): Element[] {
  return [...state.formatting.element(row).children].filter(child =>
    isTableCellElement(child, state),
  );
}

function tableCellInputs(
  row: Element,
  state: TaffyLayoutState,
): SimpleTableCellInput[] {
  return tableCellElements(row, state).map(element => ({
    element,
    colSpan: tableColumnSpan(element),
    rowSpan: tableRowSpan(element),
  }));
}

function createTableCellPlacements(
  rows: SimpleTableCellInput[][],
): SimpleTableCellPlacement[][] {
  const activeRowSpans: number[] = [];

  return rows.map((cells, rowIndex) => {
    const placements: SimpleTableCellPlacement[] = [];
    let columnIndex = 0;

    for (const cell of cells) {
      while ((activeRowSpans[columnIndex] ?? 0) > 0) {
        columnIndex += 1;
      }

      placements.push({ ...cell, columnIndex, rowIndex });

      for (let offset = 0; offset < cell.colSpan; offset += 1) {
        activeRowSpans[columnIndex + offset] = Math.max(
          activeRowSpans[columnIndex + offset] ?? 0,
          cell.rowSpan,
        );
      }

      columnIndex += cell.colSpan;
    }

    for (let index = 0; index < activeRowSpans.length; index += 1) {
      activeRowSpans[index] = Math.max(0, (activeRowSpans[index] ?? 0) - 1);
    }

    return placements;
  });
}

function tableColumnSpan(cell: Element): number {
  const attr = cell.getAttribute('colspan');

  if (!attr) {
    return 1;
  }

  const value = Number(attr);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 1000) : 1;
}

function tableRowSpan(cell: Element): number {
  const attr = cell.getAttribute('rowspan');

  if (!attr) {
    return 1;
  }

  const value = Number(attr);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 65534) : 1;
}

function applyTableSpanConstraints(
  trackSizes: number[],
  constraints: SimpleTableSpanConstraint[],
  trackSpacing: number,
): void {
  for (const constraint of constraints) {
    const tracks = trackSizes.slice(
      constraint.startIndex,
      constraint.startIndex + constraint.span,
    );
    const currentSize = tracks.reduce((sum, size) => sum + size, 0);
    const targetSize = Math.max(
      0,
      constraint.size - trackSpacing * (constraint.span - 1),
    );

    if (currentSize >= targetSize) {
      continue;
    }

    const extraSize = targetSize - currentSize;

    if (currentSize === 0) {
      const extraPerTrack = extraSize / tracks.length;

      for (
        let index = constraint.startIndex;
        index < constraint.startIndex + constraint.span;
        index += 1
      ) {
        trackSizes[index] += extraPerTrack;
      }

      continue;
    }

    for (let offset = 0; offset < tracks.length; offset += 1) {
      trackSizes[constraint.startIndex + offset] +=
        extraSize * (tracks[offset] / currentSize);
    }
  }
}

function applyExplicitTableWidth(
  columnWidths: number[],
  explicitWidth: number,
  horizontalSpacing: number,
): void {
  if (explicitWidth <= 0 || columnWidths.length === 0) {
    return;
  }

  const currentTrackWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const targetTrackWidth = Math.max(
    0,
    explicitWidth - horizontalSpacing * (columnWidths.length + 1),
  );

  if (currentTrackWidth === targetTrackWidth) {
    return;
  }

  if (currentTrackWidth === 0) {
    const width = targetTrackWidth / columnWidths.length;

    for (let index = 0; index < columnWidths.length; index += 1) {
      columnWidths[index] = width;
    }

    return;
  }

  const scale = targetTrackWidth / currentTrackWidth;

  for (let index = 0; index < columnWidths.length; index += 1) {
    columnWidths[index] *= scale;
  }
}

function applyExplicitTableHeight(
  rowHeights: number[][],
  explicitHeight: number,
  captionHeight: number,
  verticalSpacing: number,
): void {
  const rows = rowHeights.flat();

  if (explicitHeight <= 0 || rows.length === 0) {
    return;
  }

  const currentRowsHeight = rows.reduce((sum, height) => sum + height, 0);
  const targetRowsHeight = Math.max(
    0,
    explicitHeight - captionHeight - verticalSpacing * (rows.length + 1),
  );

  if (currentRowsHeight === targetRowsHeight) {
    return;
  }

  if (currentRowsHeight === 0) {
    const height = targetRowsHeight / rows.length;

    for (const sectionRows of rowHeights) {
      for (let index = 0; index < sectionRows.length; index += 1) {
        sectionRows[index] = height;
      }
    }

    return;
  }

  const scale = targetRowsHeight / currentRowsHeight;

  for (const sectionRows of rowHeights) {
    for (let index = 0; index < sectionRows.length; index += 1) {
      sectionRows[index] *= scale;
    }
  }
}

function tableTrackOffset(
  trackSizes: number[],
  trackIndex: number,
  trackSpacing: number,
  leadingOffset: number,
): number {
  const precedingTracks = trackSizes
    .slice(0, trackIndex)
    .reduce((sum, size) => sum + size, 0);

  return leadingOffset + precedingTracks + trackSpacing * trackIndex;
}

function spannedTracksSize(
  trackSizes: number[],
  trackIndex: number,
  span: number,
  trackSpacing: number,
): number {
  if (span <= 0) {
    return 0;
  }

  const trackSize = trackSizes
    .slice(trackIndex, trackIndex + span)
    .reduce((sum, size) => sum + size, 0);

  return trackSize + trackSpacing * Math.max(0, span - 1);
}

function numericDimension(value: SupportedStyle['width']): number {
  return typeof value === 'number' ? value : 0;
}

function tableCaptionOuterWidth(style: SupportedStyle): number {
  const border = effectiveBorderWidth(style);
  const horizontalBox =
    numericDimension(style.padding.left) +
    numericDimension(style.padding.right) +
    border.left +
    border.right;

  return style.boxSizing === 'border-box'
    ? numericDimension(style.width)
    : numericDimension(style.width) + horizontalBox;
}

function tableCaptionOuterHeight(style: SupportedStyle): number {
  const border = effectiveBorderWidth(style);
  const verticalBox =
    numericDimension(style.padding.top) +
    numericDimension(style.padding.bottom) +
    border.top +
    border.bottom;

  return style.boxSizing === 'border-box'
    ? numericDimension(style.height)
    : numericDimension(style.height) + verticalBox;
}

function tableCellOuterSize(
  style: SupportedStyle,
  isCollapsedBorderTable: boolean,
): { width: number; height: number } {
  const border = effectiveBorderWidth(style);
  const horizontalBorder = isCollapsedBorderTable
    ? horizontal(border) / 2
    : horizontal(border);
  const verticalBorder = isCollapsedBorderTable
    ? vertical(border) / 2
    : vertical(border);
  const horizontalBox =
    numericDimension(style.padding.left) +
    numericDimension(style.padding.right) +
    horizontalBorder;
  const verticalBox =
    numericDimension(style.padding.top) +
    numericDimension(style.padding.bottom) +
    verticalBorder;

  if (style.boxSizing === 'border-box') {
    return {
      width: numericDimension(style.width),
      height: numericDimension(style.height),
    };
  }

  // Chromium's fixed explicit table-cell dimensions are asymmetric here:
  // width contributes as content width plus padding/border, while height
  // contributes as an outer row height floor rather than content plus box.
  return {
    width: numericDimension(style.width) + horizontalBox,
    height: Math.max(numericDimension(style.height), verticalBox),
  };
}

function tableCollapsedBorderInset(
  rowPlacements: SimpleTableCellPlacement[][][],
  state: TaffyLayoutState,
): Edges {
  const inset = zeroEdges();

  for (const section of rowPlacements) {
    for (const row of section) {
      for (const cell of row) {
        const border = effectiveBorderWidth(
          resolveSupportedStyle(cell.element, state),
        );
        inset.top = Math.max(inset.top, border.top / 2);
        inset.right = Math.max(inset.right, border.right / 2);
        inset.bottom = Math.max(inset.bottom, border.bottom / 2);
        inset.left = Math.max(inset.left, border.left / 2);
      }
    }
  }

  return inset;
}

function createReplacedMeasureContext(
  style: SupportedStyle,
  width: number,
  height: number,
  textMeasurer: TextMeasurer,
): MeasureContext {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    wordSpacing: style.wordSpacing,
    lineHeight: style.lineHeight,
    whiteSpace: style.whiteSpace,
    textTransform: style.textTransform,
    textMeasurer,
    replacedSize: { width, height },
  };
}

function horizontal(edges: Edges): number {
  return edges.left + edges.right;
}

function vertical(edges: Edges): number {
  return edges.top + edges.bottom;
}
