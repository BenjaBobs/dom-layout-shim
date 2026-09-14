import type { Viewport } from '../../api/layout-engine-config.ts';
import type { SupportedStyle } from '../css/supported-style.ts';
import type { PercentageBasis } from './containing-block.ts';
import { hasCalculatedDimension } from './length-dependencies.ts';
import { Display, Style, type TaffyTree } from './taffy/taffy-bindings.ts';
import {
  type MeasureContext,
  measureTaffyNode,
} from './taffy/taffy-measure.ts';
import { type TaffyStyleContext, toTaffyStyle } from './taffy/taffy-style.ts';

export type FormattingSource =
  | Readonly<{ kind: 'element'; element: Element }>
  | Readonly<{ kind: 'generated'; owner: Element; pseudo: 'before' | 'after' }>
  | Readonly<{
      kind: 'anonymous';
      owner: Element;
      role: 'inline' | 'table-cell';
    }>
  | Readonly<{ kind: 'viewport' }>;

export type PlannedFormatting = {
  readonly node: bigint;
  readonly source: FormattingSource;
  readonly children: readonly bigint[];
  style: SupportedStyle | undefined;
  readonly context: TaffyStyleContext | undefined;
};

/** Every backend node has an identity, source, and formatting dependencies. */
export class FormattingPlan {
  private readonly nodes = new Map<bigint, PlannedFormatting>();
  private readonly tree: TaffyTree;
  constructor(tree: TaffyTree) {
    this.tree = tree;
  }

  create(input: {
    source: Exclude<FormattingSource, { kind: 'viewport' }>;
    style: SupportedStyle;
    context?: TaffyStyleContext;
    measure?: MeasureContext;
    children?: readonly bigint[];
  }): bigint {
    const children = [...(input.children ?? [])];
    const style = toTaffyStyle(input.style, input.context);
    const node =
      input.measure && children.length === 0
        ? this.tree.newLeafWithContext(style, input.measure)
        : this.tree.newWithChildren(style, children);
    this.nodes.set(node, {
      node,
      source: input.source,
      children,
      style: input.style,
      context: input.context,
    });
    return node;
  }

  updateStyle(node: bigint, style: SupportedStyle): void {
    const entry = this.require(node);
    entry.style = style;
    this.tree.setStyle(node, toTaffyStyle(style, entry.context));
  }

  /** Each formatting root uses the same finite dependency schedule, including
   * intrinsic and allocated table-cell passes. No DOM-only or catch-up queue. */
  compute(
    root: bigint,
    available: {
      width: number | 'max-content';
      height: number | 'max-content';
    },
    basis: (entry: Readonly<PlannedFormatting>) => PercentageBasis,
  ): void {
    const compute = () =>
      this.tree.computeLayoutWithMeasure(root, available, measureTaffyNode);
    compute();
    let level = [this.require(root)];
    while (level.length) {
      const affected = level.filter(
        entry => entry.style && hasCalculatedDimension(entry.style),
      );
      for (const entry of affected) {
        if (!entry.style) continue;
        this.tree.setStyle(
          entry.node,
          toTaffyStyle(entry.style, {
            ...entry.context,
            percentageBasis: basis(entry),
          }),
        );
      }
      if (affected.length) compute();
      level = level.flatMap(entry =>
        entry.children.map(child => this.require(child)),
      );
    }
  }

  private require(node: bigint): PlannedFormatting {
    const entry = this.nodes.get(node);
    if (!entry)
      throw new Error('Backend node has no registered formatting identity');
    return entry;
  }

  viewport(children: bigint[], viewport: Viewport): bigint {
    const style = new Style();
    style.display = Display.Block;
    style.size = { width: viewport.width, height: viewport.height };
    const node = this.tree.newWithChildren(style, children);
    this.nodes.set(node, {
      node,
      source: { kind: 'viewport' },
      children,
      style: undefined,
      context: undefined,
    });
    return node;
  }
}
