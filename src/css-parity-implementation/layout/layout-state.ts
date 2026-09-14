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
  cellFormatting: ReadonlyMap<
    Element,
    Readonly<{ node: bigint; style: SupportedStyle }>
  >;
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
  readonly width: number;
  readonly height: number;
  readonly caption?: SimpleTableCaptionLayout;
  readonly columnGroups: readonly SimpleTableColumnGroupLayout[];
  readonly sections: readonly SimpleTableSectionLayout[];
};

export type SimpleTableCaptionLayout = {
  readonly element: Element;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type SimpleTableSectionLayout = {
  /** Anonymous row groups have no DOM geometry of their own. */
  readonly element: Element | undefined;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly SimpleTableRowLayout[];
};

export type SimpleTableRowLayout = {
  readonly element: Element;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly SimpleTableCellLayout[];
};

export type SimpleTableColumnGroupLayout = {
  readonly element: Element;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly columns: readonly SimpleTableColumnLayout[];
};

export type SimpleTableColumnLayout = {
  readonly element: Element;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type SimpleTableCellLayout = {
  readonly element: Element;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};
