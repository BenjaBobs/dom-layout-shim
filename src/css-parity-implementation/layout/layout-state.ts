import type { Viewport } from '../../api/layout-engine-config.ts';
import type { NativeControlMetrics } from '../../api/native-control-profile.ts';
import type { TextMeasurer } from '../../api/text-measurer.ts';
import type { ResolvedStyles, StyleResolver } from '../css/style-resolver.ts';
import type { SupportedStyle } from '../css/supported-style.ts';
import type { FormattingPlan } from './formatting-plan.ts';
import type { FormattingTree } from './formatting-tree.ts';
import type { InlineLayout } from './inline-formatting.ts';
import type { LayoutGeometry } from './layout-geometry.ts';
import type { TaffyTree } from './taffy/taffy-bindings.ts';
import type { MeasureContext } from './taffy/taffy-measure.ts';

export type LayoutReadState = {
  formatting: FormattingTree;
  geometry: LayoutGeometry;
  elementNodes: ReadonlyMap<Element, bigint>;
  contentsElements: ReadonlySet<Element>;
  tableLayouts: ReadonlyMap<Element, SimpleTableLayout>;
  cellFormatting: ReadonlyMap<Element, { node: bigint; style: SupportedStyle }>;
  styleResolver: ResolvedStyles;
  tree: Pick<TaffyTree, 'getLayout'>;
  viewport: Viewport;
  domOrder: number;
  paintOrders: WeakMap<Element, number>;
};

export type TaffyLayoutState = LayoutReadState & {
  phase: 'building';
  plan: FormattingPlan;
  elementNodes: Map<Element, bigint>;
  outOfFlowNodes: Map<Element, bigint[]>;
  measureContexts: Map<Element, MeasureContext>;
  inlineContexts: {
    host: Element;
    node: bigint;
    anonymous: boolean;
    format: (width: number) => InlineLayout;
  }[];
  contentsElements: Set<Element>;
  tableLayouts: Map<Element, SimpleTableLayout>;
  cellFormatting: Map<Element, { node: bigint; style: SupportedStyle }>;
  styleResolver: StyleResolver;
  textMeasurer: TextMeasurer;
  nativeControlMetrics: NativeControlMetrics;
};

export type CompletedLayout = Omit<
  LayoutReadState,
  'geometry' | 'domOrder' | 'paintOrders'
> & {
  phase: 'completed';
  noBoxElements: ReadonlySet<Element>;
  textOverflowElements: ReadonlySet<Element>;
  inlineContexts: readonly {
    host: Element;
    node: bigint;
    anonymous: boolean;
    result: InlineLayout;
  }[];
};

export type CollectionState = Omit<CompletedLayout, 'phase'> & {
  phase: 'collecting';
  geometry: LayoutGeometry;
  domOrder: number;
  paintOrders: WeakMap<Element, number>;
};

export type SimpleTableLayout = {
  width: number;
  height: number;
  caption?: SimpleTableCaptionLayout;
  columnGroups: SimpleTableColumnGroupLayout[];
  sections: SimpleTableSectionLayout[];
};

export type SimpleTableCaptionLayout = {
  element: Element;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SimpleTableSectionLayout = {
  /** Anonymous row groups have no DOM geometry of their own. */
  element: Element | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: SimpleTableRowLayout[];
};

export type SimpleTableRowLayout = {
  element: Element;
  x: number;
  y: number;
  width: number;
  height: number;
  cells: SimpleTableCellLayout[];
};

export type SimpleTableColumnGroupLayout = {
  element: Element;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: SimpleTableColumnLayout[];
};

export type SimpleTableColumnLayout = {
  element: Element;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SimpleTableCellLayout = {
  element: Element;
  x: number;
  y: number;
  width: number;
  height: number;
};
