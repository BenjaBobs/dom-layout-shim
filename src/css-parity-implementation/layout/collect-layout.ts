import type { Box } from '../../api/box.ts';
import type { Viewport } from '../../api/layout-engine-config.ts';
import {
  resolveCalculatedDimension,
  resolveDefiniteLength,
} from '../css/length-value.ts';
import type { SupportedStyle } from '../css/supported-style.ts';
import { elementTransform, transformBox } from '../geometry/transform.ts';
import { prepareHitTesting } from '../hit-testing/point-query.ts';
import { type BoxInsets, emptyBoxInsets } from './box-metrics.ts';
import { percentageBasis } from './containing-block.ts';
import type { PaintMetadata } from './geometry-record.ts';
import {
  containingBlockEnvironment,
  containingBlockFor,
  markElementNoBox,
  readElementScrollOffset,
  renderedElementChildren,
  resolveSupportedStyle,
} from './layout-context.ts';
import { createLayoutGeometry } from './layout-geometry.ts';
import type { LayoutSnapshot, ScrollOffset } from './layout-source.ts';
import type {
  CollectionState,
  CompletedLayout,
  LayoutReadState,
  SimpleTableLayout,
} from './layout-state.ts';
import { projectLayoutGeometry } from './project-layout.ts';
import { effectiveBorderWidth } from './resolved-border.ts';

export function collectionState(layout: CompletedLayout): CollectionState {
  const state: CollectionState = {
    ...layout,
    phase: 'collecting',
    geometry: createLayoutGeometry(),
    domOrder: 0,
    paintOrders: new WeakMap(),
  };
  for (const element of layout.noBoxElements) markElementNoBox(element, state);
  return state;
}

function collectScrollSizes(
  document: Document,
  viewport: Viewport,
  scroll: ScrollOffset,
  state: CollectionState,
): Map<Element, { width: number; height: number }> {
  // Accumulate local overflow once per snapshot. A clipped child's own scroll
  // area must not enlarge its parent's area, and scroll offsets must not make
  // the content shrink as it is scrolled out of view.
  const sizes = new Map<Element, { width: number; height: number }>();
  const ends = new Map<Element, { width: number; height: number }>();
  let documentWidth = viewport.width;
  let documentHeight = 0;
  for (const [element, box] of [...state.geometry.normalRects].reverse()) {
    const style = resolveSupportedStyle(element, state);
    if (!hasPrincipalBox(element, state) || style.display === 'inline')
      continue;
    const insets = state.geometry.insets.get(element) ?? emptyBoxInsets;
    const border = insets.border;
    const clientWidth = Math.max(0, box.width - border.left - border.right);
    const clientHeight = Math.max(0, box.height - border.top - border.bottom);
    const end = ends.get(element) ?? { width: 0, height: 0 };
    const node = state.elementNodes.get(element);
    // Text and generated boxes have no DOM element to visit. Taffy's overflow
    // coordinates already start at the padding edge (not the border edge).
    if (node && state.textOverflowElements.has(element)) {
      const layout = state.tree.getLayout(node);
      end.width = Math.max(end.width, layout.contentWidth);
      end.height = Math.max(end.height, layout.contentHeight);
    }
    const paddingBasis = element.parentElement
      ? (state.geometry.contentRects.get(element.parentElement)?.width ??
        viewport.width)
      : viewport.width;
    const size = {
      width: Math.max(
        clientWidth,
        end.width +
          (isProgrammaticallyScrollable(style.overflowX)
            ? insets.padding.right
            : 0),
      ),
      height: Math.max(
        clientHeight,
        end.height +
          (isProgrammaticallyScrollable(style.overflowY)
            ? insets.padding.bottom
            : 0),
      ),
    };
    sizes.set(element, size);
    if (style.position === 'fixed') continue;
    let parent = containingBlockFor(element, style, state);
    while (parent && state.contentsElements.has(parent))
      parent = parent.parentElement;
    const parentBox = parent
      ? state.geometry.normalRects.get(parent)
      : undefined;
    const parentBorder = parent
      ? (state.geometry.insets.get(parent)?.border ?? emptyBoxInsets.border)
      : { left: 0, top: 0 };
    const parentScroll = parent
      ? state.geometry.elementScrolls.get(parent)
      : undefined;
    const width = Math.max(
      box.width,
      style.overflowX === 'visible' ? border.left + size.width : 0,
    );
    const height = Math.max(
      box.height,
      style.overflowY === 'visible' ? border.top + size.height : 0,
    );
    const overflowBox = { ...box, width, height };
    const transformed = transformBox(
      overflowBox,
      elementTransform(box, style.transform, style.transformOrigin),
    );
    const marginRight =
      style.margin.right === 'auto'
        ? 0
        : (resolveDefiniteLength(style.margin.right, paddingBasis) ?? 0);
    const marginBottom =
      style.margin.bottom === 'auto'
        ? 0
        : (resolveDefiniteLength(style.margin.bottom, paddingBasis) ?? 0);
    const right =
      Math.max(box.x + width, transformed.x + transformed.width) +
      Math.max(0, marginRight);
    const bottom =
      Math.max(box.y + height, transformed.y + transformed.height) +
      Math.max(0, marginBottom);
    if (parentBox && parent) {
      const parentEnd = ends.get(parent) ?? { width: 0, height: 0 };
      parentEnd.width = Math.max(
        parentEnd.width,
        right - parentBox.x - parentBorder.left + (parentScroll?.x ?? 0),
      );
      parentEnd.height = Math.max(
        parentEnd.height,
        bottom - parentBox.y - parentBorder.top + (parentScroll?.y ?? 0),
      );
      ends.set(parent, parentEnd);
    } else {
      documentWidth = Math.max(documentWidth, right + scroll.x);
      documentHeight = Math.max(documentHeight, bottom + scroll.y);
    }
  }
  // html/body are synthetic viewport wrappers in this engine, rather than
  // ordinary Taffy boxes. Standards-mode root scrolling includes the viewport.
  sizes.set(document.documentElement, {
    width: documentWidth,
    height: Math.max(viewport.height, documentHeight),
  });
  sizes.set(document.body, {
    width: documentWidth,
    height:
      document.compatMode === 'BackCompat'
        ? Math.max(viewport.height, documentHeight)
        : documentHeight,
  });
  return sizes;
}

export function collectTaffyLayoutSnapshot(
  document: Document,
  viewport: Viewport,
  scroll: ScrollOffset,
  state: CollectionState,
): LayoutSnapshot {
  recordChildLayouts(
    document.body,
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    viewport,
    scroll,
    false,
    false,
    state,
  );
  recordInlineFragments(document, state);
  const geometry = state.geometry.complete(
    collectScrollSizes(document, viewport, scroll, state),
  );
  const projected = projectLayoutGeometry(
    document,
    geometry,
    state.styleResolver,
    state.contentsElements,
  );
  prepareHitTesting(projected.boxes);

  return {
    boxes: projected.boxes,
    rects: projected.rects,
    fragmentRects: projected.fragmentRects,
    layoutRects: geometry.layoutRects,
    resizeRects: geometry.resizeRects,
    clientRects: geometry.clientRects,
    scrollSizes: geometry.scrollSizes,
    contentRects: geometry.contentRects,
    intersectionRects: projected.intersectionRects,
    elementScrolls: geometry.elementScrolls,
    offsetParents: collectOffsetParents(document, state),
    scrollContainers: collectScrollContainers(document, state),
    fixedElements: collectFixedElements(document, state),
  };
}

function recordInlineFragments(
  _document: Document,
  state: CollectionState,
): void {
  for (const context of state.inlineContexts) {
    const hostBox = state.geometry.contentRects.get(context.host);
    if (!hostBox) continue;
    const layout = state.tree.getLayout(context.node);
    const origin = context.anonymous
      ? {
          x: (state.geometry.rects.get(context.host)?.x ?? 0) + layout.x,
          y:
            (state.geometry.rects.get(context.host)?.y ?? 0) +
            layout.y +
            tableCellContentOffset(
              context.host,
              state.geometry.rects.get(context.host)?.height ?? 0,
              state,
            ),
        }
      : hostBox;
    const result = context.result;
    for (const [element, localFragments] of result.fragments) {
      if (
        state.formatting.element(element).participation.geometry !== 'fragments'
      )
        throw new Error(
          'Inline formatter returned fragments for a non-inline element',
        );
      const style = resolveSupportedStyle(element, state);
      const fragments = localFragments.map(box => ({
        ...box,
        x: box.x + origin.x,
        y: box.y + origin.y,
      }));
      const domOrder = nextDomOrder(state);
      state.paintOrders.set(element, domOrder);
      state.geometry.recordScrollOffset(
        element,
        readElementScrollOffset(element),
      );
      state.geometry.record(element, {
        kind: 'inline',
        fragments,
        paint: paintMetadata(element, style, domOrder, true, state),
      });
    }
  }
}

function collectOffsetParents(
  document: Document,
  state: CollectionState,
): Map<Element, Element | null> {
  const offsetParents = new Map<Element, Element | null>();

  for (const element of state.formatting.elements) {
    offsetParents.set(element, findOffsetParent(element, document, state));
  }

  return offsetParents;
}

function findOffsetParent(
  element: Element,
  document: Document,
  state: LayoutReadState,
): Element | null {
  if (
    element === document.body ||
    element === document.documentElement ||
    !hasPrincipalBox(element, state) ||
    resolveSupportedStyle(element, state).position === 'fixed'
  ) {
    return null;
  }

  for (
    let ancestor = element.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    if (ancestor === document.body) {
      return ancestor;
    }

    if (!hasPrincipalBox(ancestor, state)) {
      continue;
    }

    const style = resolveSupportedStyle(ancestor, state);
    const tagName = ancestor.tagName.toLowerCase();

    if (
      style.position !== 'static' ||
      tagName === 'table' ||
      tagName === 'td' ||
      tagName === 'th'
    ) {
      return ancestor;
    }
  }

  return null;
}

function hasPrincipalBox(element: Element, state: LayoutReadState): boolean {
  if (state.formatting.element(element).participation.geometry === 'none')
    return false;

  return state.geometry.rects.has(element);
}

function collectScrollContainers(
  _document: Document,
  state: CollectionState,
): Map<Element, { x: boolean; y: boolean }> {
  const containers = new Map<Element, { x: boolean; y: boolean }>();

  for (const element of state.formatting.elements) {
    const style = resolveSupportedStyle(element, state);

    containers.set(element, {
      x: isProgrammaticallyScrollable(style.overflowX),
      y: isProgrammaticallyScrollable(style.overflowY),
    });
  }

  return containers;
}

function collectFixedElements(
  _document: Document,
  state: CollectionState,
): Set<Element> {
  return new Set(
    state.formatting.elements.filter(element =>
      hasFixedAncestor(element, state),
    ),
  );
}

function hasFixedAncestor(element: Element, state: LayoutReadState): boolean {
  for (
    let current: Element | null = element;
    current;
    current = current.parentElement
  ) {
    if (resolveSupportedStyle(current, state).position === 'fixed') {
      return true;
    }
  }

  return false;
}

function isProgrammaticallyScrollable(
  overflow: SupportedStyle['overflowX'] | SupportedStyle['overflowY'],
): boolean {
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden';
}

function recordChildLayouts(
  parent: Element | null,
  origin: { x: number; y: number },
  layoutOrigin: { x: number; y: number },
  viewport: Viewport,
  scroll: ScrollOffset,
  fixedContainingBlock: boolean,
  suppressedByHiddenUntilFound: boolean,
  state: CollectionState,
): void {
  if (!parent) {
    return;
  }

  for (const element of renderedElementChildren(parent, state)) {
    const node = state.elementNodes.get(element);

    if (!node) {
      if (state.contentsElements.has(element)) {
        markElementNoBox(element, state);
        recordChildLayouts(
          element,
          origin,
          layoutOrigin,
          viewport,
          scroll,
          fixedContainingBlock,
          suppressedByHiddenUntilFound,
          state,
        );
      }

      continue;
    }

    const style = resolveSupportedStyle(element, state);
    const fixedSubtree = fixedContainingBlock || style.position === 'fixed';
    const layout = state.tree.getLayout(node);
    const containingBlock =
      style.position === 'absolute'
        ? containingBlockFor(element, style, state)
        : undefined;
    const absoluteOrigin = containingBlock
      ? state.geometry.rects.get(containingBlock)
      : undefined;
    const absoluteNormalOrigin = containingBlock
      ? state.geometry.normalRects.get(containingBlock)
      : undefined;
    const visualOrigin =
      style.position === 'absolute' && containingBlock !== element.parentElement
        ? {
            x: (absoluteOrigin?.x ?? -scroll.x) + scroll.x,
            y: (absoluteOrigin?.y ?? -scroll.y) + scroll.y,
          }
        : origin;
    const normalOrigin =
      style.position === 'absolute' && containingBlock !== element.parentElement
        ? {
            x: (absoluteNormalOrigin?.x ?? -scroll.x) + scroll.x,
            y: (absoluteNormalOrigin?.y ?? -scroll.y) + scroll.y,
          }
        : layoutOrigin;
    // Taffy models fixed as absolute, so collection re-roots fixed boxes to
    // viewport coordinates instead of inheriting a scrolled ancestor origin.
    const normalLayoutBox = {
      x: style.position === 'fixed' ? layout.x : normalOrigin.x + layout.x,
      y: style.position === 'fixed' ? layout.y : normalOrigin.y + layout.y,
      width: layout.width,
      height: layout.height,
    };
    const visualLayoutBox = {
      x: style.position === 'fixed' ? layout.x : visualOrigin.x + layout.x,
      y: style.position === 'fixed' ? layout.y : visualOrigin.y + layout.y,
      width: layout.width,
      height: layout.height,
    };
    const normalBox = toViewportBox(normalLayoutBox, scroll, fixedSubtree);
    const box = applyStickyPosition(
      element,
      style,
      toViewportBox(visualLayoutBox, scroll, fixedSubtree),
      viewport,
      state,
    );
    const adjustedLayoutBox = fixedSubtree
      ? box
      : { ...box, x: box.x + scroll.x, y: box.y + scroll.y };
    const domOrder = state.domOrder;
    state.domOrder += 1;
    state.paintOrders.set(element, domOrder);

    const elementScroll = readElementScrollOffset(element);
    state.geometry.recordScrollOffset(element, elementScroll);
    recordBox(
      element,
      style,
      box,
      domOrder,
      !suppressedByHiddenUntilFound,
      state,
      style.position === 'sticky' ? adjustedLayoutBox : normalBox,
      normalBox,
    );
    const tableLayout = state.tableLayouts.get(element);
    if (tableLayout) {
      recordSimpleTableLayout(tableLayout, normalBox, viewport, scroll, state);
      continue;
    }

    recordChildLayouts(
      element,
      {
        x: adjustedLayoutBox.x - elementScroll.x,
        y: adjustedLayoutBox.y - elementScroll.y,
      },
      {
        x:
          (style.position === 'sticky'
            ? adjustedLayoutBox.x
            : normalLayoutBox.x) - elementScroll.x,
        y:
          (style.position === 'sticky'
            ? adjustedLayoutBox.y
            : normalLayoutBox.y) - elementScroll.y,
      },
      viewport,
      scroll,
      fixedSubtree,
      suppressedByHiddenUntilFound ||
        state.formatting.element(element).hiddenUntilFound,
      state,
    );
  }
}

function toViewportBox(
  box: Box,
  scroll: ScrollOffset,
  fixedSubtree: boolean,
): Box {
  if (fixedSubtree) {
    return box;
  }

  return {
    x: box.x - scroll.x,
    y: box.y - scroll.y,
    width: box.width,
    height: box.height,
  };
}

function applyStickyPosition(
  element: Element,
  style: SupportedStyle,
  box: Box,
  viewport: Viewport,
  state: LayoutReadState,
): Box {
  if (style.position !== 'sticky') {
    return box;
  }

  // Taffy intentionally leaves sticky nodes in normal flow. Clamp the visual
  // box against the nearest supported scrolling ancestor during collection so
  // descendants, clipping, and hit testing inherit the same translated origin.
  const horizontalBounds = stickyScrollport(element, 'x', viewport, state);
  const verticalBounds = stickyScrollport(element, 'y', viewport, state);
  const adjusted = {
    ...box,
    x: clampStickyAxis(
      box.x,
      box.width,
      resolvedInset(style.left, horizontalBounds),
      resolvedInset(style.right, horizontalBounds),
      horizontalBounds,
    ),
    y: clampStickyAxis(
      box.y,
      box.height,
      resolvedInset(style.top, verticalBounds),
      resolvedInset(style.bottom, verticalBounds),
      verticalBounds,
    ),
  };

  return constrainStickyToContainingBlock(element, style, adjusted, state);
}

function resolvedInset(
  value: SupportedStyle['top'],
  bounds: { start: number; end: number },
): number | undefined {
  if (value === undefined) return undefined;
  const resolved = resolveCalculatedDimension(value, bounds.end - bounds.start);
  if (typeof resolved === 'number') return resolved;
  return resolved === undefined
    ? undefined
    : (Number(resolved.slice(0, -1)) * (bounds.end - bounds.start)) / 100;
}

function constrainStickyToContainingBlock(
  element: Element,
  style: SupportedStyle,
  box: Box,
  state: LayoutReadState,
): Box {
  const containingBlock = element.parentElement
    ? state.geometry.clientRects.get(element.parentElement)
    : undefined;

  if (!containingBlock) {
    return box;
  }

  const minimumX = containingBlock.x;
  const maximumX = containingBlock.x + containingBlock.width - box.width;
  const minimumY = containingBlock.y;
  const maximumY = containingBlock.y + containingBlock.height - box.height;

  return {
    ...box,
    x:
      style.left === undefined && style.right === undefined
        ? box.x
        : clampToContainingRange(
            box.x,
            minimumX,
            maximumX,
            style.left !== undefined,
          ),
    y:
      style.top === undefined && style.bottom === undefined
        ? box.y
        : clampToContainingRange(
            box.y,
            minimumY,
            maximumY,
            style.top !== undefined,
          ),
  };
}

function clampToContainingRange(
  position: number,
  minimum: number,
  maximum: number,
  startSideWins: boolean,
): number {
  if (maximum < minimum) {
    return startSideWins ? minimum : maximum;
  }

  return Math.min(Math.max(position, minimum), maximum);
}

function stickyScrollport(
  element: Element,
  axis: 'x' | 'y',
  viewport: Viewport,
  state: LayoutReadState,
): { start: number; end: number } {
  for (
    let ancestor = element.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const style = resolveSupportedStyle(ancestor, state);
    const overflow = axis === 'x' ? style.overflowX : style.overflowY;

    if (!isProgrammaticallyScrollable(overflow)) {
      continue;
    }

    const clientBox = state.geometry.clientRects.get(ancestor);

    if (clientBox) {
      const start = axis === 'x' ? clientBox.x : clientBox.y;
      const size = axis === 'x' ? clientBox.width : clientBox.height;
      return { start, end: start + size };
    }
  }

  return {
    start: 0,
    end: axis === 'x' ? viewport.width : viewport.height,
  };
}

function clampStickyAxis(
  position: number,
  size: number,
  startInset: number | undefined,
  endInset: number | undefined,
  bounds: { start: number; end: number },
): number {
  let result = position;

  if (startInset !== undefined) {
    result = Math.max(result, bounds.start + startInset);
  }

  if (endInset !== undefined) {
    const endPosition = bounds.end - endInset - size;
    // CSS weakens the end inset when both constraints cannot fit, so the
    // start-side constraint wins for the physical left-to-right/top-to-bottom
    // axes supported by this engine.
    if (startInset === undefined || endPosition >= bounds.start + startInset) {
      result = Math.min(result, endPosition);
    }
  }

  return result;
}

function recordSimpleTableLayout(
  tableLayout: SimpleTableLayout,
  normalTableBox: Box,
  viewport: Viewport,
  scroll: ScrollOffset,
  state: CollectionState,
): void {
  if (tableLayout.caption) {
    const captionStyle = resolveSupportedStyle(
      tableLayout.caption.element,
      state,
    );
    const normalCaptionBox = offsetTableBox(
      normalTableBox,
      tableLayout.caption,
    );
    const captionBox = tablePartVisualBox(
      tableLayout.caption.element,
      captionStyle,
      normalCaptionBox,
      viewport,
      state,
    );
    state.geometry.recordScrollOffset(
      tableLayout.caption.element,
      readElementScrollOffset(tableLayout.caption.element),
    );
    recordBox(
      tableLayout.caption.element,
      captionStyle,
      captionBox,
      nextDomOrder(state),
      true,
      state,
      stickyLayoutBox(captionStyle, captionBox, normalCaptionBox, scroll),
      normalCaptionBox,
    );
  }

  for (const columnGroup of tableLayout.columnGroups) {
    const columnGroupStyle = resolveSupportedStyle(columnGroup.element, state);
    const normalColumnGroupBox = offsetTableBox(normalTableBox, columnGroup);
    const columnGroupBox = tablePartVisualBox(
      columnGroup.element,
      columnGroupStyle,
      normalColumnGroupBox,
      viewport,
      state,
    );
    state.geometry.recordScrollOffset(
      columnGroup.element,
      readElementScrollOffset(columnGroup.element),
    );
    recordBox(
      columnGroup.element,
      columnGroupStyle,
      columnGroupBox,
      nextDomOrder(state),
      false,
      state,
      stickyLayoutBox(
        columnGroupStyle,
        columnGroupBox,
        normalColumnGroupBox,
        scroll,
      ),
      normalColumnGroupBox,
    );

    for (const column of columnGroup.columns) {
      const columnStyle = resolveSupportedStyle(column.element, state);
      const normalColumnBox = offsetTableBox(normalTableBox, column);
      const columnBox = tablePartVisualBox(
        column.element,
        columnStyle,
        normalColumnBox,
        viewport,
        state,
      );
      state.geometry.recordScrollOffset(
        column.element,
        readElementScrollOffset(column.element),
      );
      recordBox(
        column.element,
        columnStyle,
        columnBox,
        nextDomOrder(state),
        false,
        state,
        stickyLayoutBox(columnStyle, columnBox, normalColumnBox, scroll),
        normalColumnBox,
      );
    }
  }

  for (const section of tableLayout.sections) {
    if (section.element) {
      const sectionStyle = resolveSupportedStyle(section.element, state);
      const normalSectionBox = offsetTableBox(normalTableBox, section);
      const sectionBox = tablePartVisualBox(
        section.element,
        sectionStyle,
        normalSectionBox,
        viewport,
        state,
      );
      state.geometry.recordScrollOffset(
        section.element,
        readElementScrollOffset(section.element),
      );
      recordBox(
        section.element,
        sectionStyle,
        sectionBox,
        nextDomOrder(state),
        false,
        state,
        stickyLayoutBox(sectionStyle, sectionBox, normalSectionBox, scroll),
        normalSectionBox,
      );
    }

    for (const row of section.rows) {
      const rowStyle = resolveSupportedStyle(row.element, state);
      const normalRowBox = offsetTableBox(normalTableBox, row);
      const rowBox = tablePartVisualBox(
        row.element,
        rowStyle,
        normalRowBox,
        viewport,
        state,
      );
      state.geometry.recordScrollOffset(
        row.element,
        readElementScrollOffset(row.element),
      );
      recordBox(
        row.element,
        rowStyle,
        rowBox,
        nextDomOrder(state),
        false,
        state,
        stickyLayoutBox(rowStyle, rowBox, normalRowBox, scroll),
        normalRowBox,
      );

      for (const cell of row.cells) {
        const cellStyle = resolveSupportedStyle(cell.element, state);
        const normalCellBox = offsetTableBox(normalTableBox, cell);
        const cellBox = tablePartVisualBox(
          cell.element,
          cellStyle,
          normalCellBox,
          viewport,
          state,
        );
        const includeHitBox = tableCellIncludesHitBox(cell.element, cellStyle);
        state.geometry.recordScrollOffset(
          cell.element,
          readElementScrollOffset(cell.element),
        );
        recordBox(
          cell.element,
          cellStyle,
          cellBox,
          nextDomOrder(state),
          includeHitBox,
          state,
          stickyLayoutBox(cellStyle, cellBox, normalCellBox, scroll),
          normalCellBox,
        );
        const formatting = state.cellFormatting.get(cell.element);
        if (formatting) {
          const offsetY = tableCellContentOffset(
            cell.element,
            cell.height,
            state,
          );
          const elementScroll = readElementScrollOffset(cell.element);
          recordChildLayouts(
            cell.element,
            {
              x: cellBox.x + scroll.x - elementScroll.x,
              y: cellBox.y + scroll.y + offsetY - elementScroll.y,
            },
            {
              x: normalCellBox.x + scroll.x - elementScroll.x,
              y: normalCellBox.y + scroll.y + offsetY - elementScroll.y,
            },
            viewport,
            scroll,
            hasFixedAncestor(cell.element, state),
            false,
            state,
          );
        }
      }
    }
  }
}

function stickyLayoutBox(
  style: SupportedStyle,
  visualBox: Box,
  normalBox: Box,
  scroll: ScrollOffset,
): Box {
  if (style.position !== 'sticky') {
    return normalBox;
  }

  return {
    ...visualBox,
    x: visualBox.x + scroll.x,
    y: visualBox.y + scroll.y,
  };
}

function tablePartVisualBox(
  element: Element,
  style: SupportedStyle,
  normalBox: Box,
  viewport: Viewport,
  state: LayoutReadState,
): Box {
  const parent = element.parentElement;
  const parentVisualBox = parent ? state.geometry.rects.get(parent) : undefined;
  const parentLayoutBox = parent
    ? state.geometry.normalRects.get(parent)
    : undefined;
  const inheritedOffset = {
    x: (parentVisualBox?.x ?? 0) - (parentLayoutBox?.x ?? 0),
    y: (parentVisualBox?.y ?? 0) - (parentLayoutBox?.y ?? 0),
  };
  const visualBox = {
    ...normalBox,
    x: normalBox.x + inheritedOffset.x,
    y: normalBox.y + inheritedOffset.y,
  };

  return applyStickyPosition(element, style, visualBox, viewport, state);
}

function offsetTableBox(
  origin: Box,
  box: { x: number; y: number; width: number; height: number },
): Box {
  return {
    x: origin.x + box.x,
    y: origin.y + box.y,
    width: box.width,
    height: box.height,
  };
}

function tableCellIncludesHitBox(
  element: Element,
  style: SupportedStyle,
): boolean {
  return style.emptyCells !== 'hide' || element.textContent?.trim() !== '';
}

function nextDomOrder(state: LayoutReadState): number {
  const domOrder = state.domOrder;
  state.domOrder += 1;
  return domOrder;
}

function recordBox(
  element: Element,
  style: SupportedStyle,
  box: Box,
  domOrder: number,
  includeHitBox: boolean,
  state: LayoutReadState,
  layoutBox: Box = box,
  normalBox: Box = layoutBox,
): void {
  if (state.formatting.element(element).participation.geometry !== 'principal')
    throw new Error('Principal geometry requires a principal formatting box');
  state.paintOrders.set(element, domOrder);
  state.geometry.record(element, {
    kind: 'principal',
    box,
    layoutBox,
    normalBox,
    insets: resolvedBoxInsets(element, style, state),
    paint: paintMetadata(element, style, domOrder, includeHitBox, state),
  });
}

function paintMetadata(
  element: Element,
  style: SupportedStyle,
  domOrder: number,
  include: boolean,
  state: LayoutReadState,
): PaintMetadata | undefined {
  if (!include) return undefined;
  return {
    // Sticky positioning creates a stacking context, including with auto z-index.
    zIndex:
      style.zIndex === 0 && hasStickyAncestor(element, state)
        ? 0.5
        : style.zIndex,
    domOrder,
    stackingOrder: stackingOrderFor(element, style, domOrder, state),
    pointerEvents: style.pointerEvents,
    visibility: style.visibility,
  };
}

function stackingOrderFor(
  element: Element,
  style: SupportedStyle,
  domOrder: number,
  state: LayoutReadState,
): number[] | undefined {
  const contexts: Array<{ style: SupportedStyle; domOrder: number }> = [];
  let positionedContainerSeen = style.position !== 'static';

  for (
    let ancestor = element.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const ancestorStyle = resolveSupportedStyle(ancestor, state);
    // In-flow descendants paint above their positioned container's background.
    // Auto-z positioned descendants still escape that paint container; only
    // actual stacking contexts constrain their z-index.
    if (
      createsStackingContext(ancestorStyle) ||
      (!positionedContainerSeen && ancestorStyle.position !== 'static')
    ) {
      contexts.unshift({
        style: ancestorStyle,
        domOrder: state.paintOrders.get(ancestor) ?? -1,
      });
    }
    if (ancestorStyle.position !== 'static') positionedContainerSeen = true;
  }

  // Encode each supported ancestor context separately. A descendant's large
  // local z-index therefore cannot outrank a sibling above its ancestor context,
  // unlike the previous flat numeric z-index sort.
  return [
    ...contexts.flatMap(context =>
      paintOrderSegment(context.style, context.domOrder),
    ),
    ...paintOrderSegment(style, domOrder),
  ];
}

function createsStackingContext(style: SupportedStyle): boolean {
  return (
    style.position === 'fixed' ||
    style.position === 'sticky' ||
    (!style.zIndexAuto && style.position !== 'static') ||
    style.transform.length > 0 ||
    style.translate !== undefined ||
    style.scale !== undefined
  );
}

function paintOrderSegment(style: SupportedStyle, domOrder: number): number[] {
  if (!style.zIndexAuto && style.zIndex < 0) return [0, style.zIndex, domOrder];
  if (!style.zIndexAuto && style.zIndex > 0) return [3, style.zIndex, domOrder];
  if (style.position !== 'static') return [2, 0, domOrder];
  return [1, 0, domOrder];
}

function hasStickyAncestor(element: Element, state: LayoutReadState): boolean {
  for (
    let current: Element | null = element;
    current;
    current = current.parentElement
  ) {
    if (resolveSupportedStyle(current, state).position === 'sticky') {
      return true;
    }
  }

  return false;
}

function resolvedBoxInsets(
  element: Element,
  style: SupportedStyle,
  state: LayoutReadState,
): BoxInsets {
  const node = state.elementNodes.get(element);
  if (node !== undefined) {
    const layout = state.tree.getLayout(node);
    return { border: layout.border, padding: layout.padding };
  }
  // Table parts without backend nodes use the table's allocated geometry.
  // Their CSS lengths still resolve through the shared containing-block model.
  const environment = containingBlockEnvironment(state, true);
  const basis = percentageBasis(element, style, {
    ...environment,
    layout: ancestor =>
      environment.layout?.(ancestor) ??
      state.geometry.layoutRects.get(ancestor),
  });
  const edge = (value: SupportedStyle['padding']['top']) =>
    resolveDefiniteLength(value, basis.width) ?? 0;
  return {
    border: effectiveBorderWidth(style),
    padding: {
      top: edge(style.padding.top),
      right: edge(style.padding.right),
      bottom: edge(style.padding.bottom),
      left: edge(style.padding.left),
    },
  };
}

function tableCellContentOffset(
  element: Element,
  height: number,
  state: LayoutReadState,
): number {
  const formatting = state.cellFormatting.get(element);
  if (!formatting) return 0;
  const remaining = Math.max(
    0,
    height - state.tree.getLayout(formatting.node).height,
  );
  const alignment = resolveSupportedStyle(element, state).verticalAlign;
  return alignment === 'middle'
    ? remaining / 2
    : alignment === 'bottom'
      ? remaining
      : 0;
}
