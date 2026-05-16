import {
  Display,
  Style,
  TaffyTree,
  loadTaffy,
} from 'taffy-layout'
import { applyInlineStyle } from '../css/inline-style-source.ts'
import { createDefaultStyle, zeroEdges, type Edges, type SupportedStyle } from '../css/supported-style.ts'
import { applyStyleRules, readStyleRules } from '../css/stylesheet-source.ts'
import type { UnsupportedCssPolicy } from '../css/unsupported-css-policy.ts'
import type { Viewport } from '../engine/layout-engine-config.ts'
import type { Box } from '../geometry/box.ts'
import type { HitBox } from '../hit-testing/hit-box.ts'
import type { TextMeasurer } from '../text/text-measurer.ts'
import type { LayoutSnapshot, ScrollOffset } from './layout-source.ts'
import { canMeasureTextLeaf, createMeasureContext, measureTaffyNode, type MeasureContext } from './taffy/taffy-measure.ts'
import { effectiveBorderWidth, toTaffyStyle } from './taffy/taffy-style.ts'

type TaffyLayoutState = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
  elementScrolls: Map<Element, ScrollOffset>
  elementNodes: Map<Element, bigint>
  contentsElements: Set<Element>
  tableLayouts: Map<Element, SimpleTableLayout>
  styles: WeakMap<Element, SupportedStyle>
  tree: TaffyTree
  rules: ReturnType<typeof readStyleRules>
  policy: UnsupportedCssPolicy | undefined
  textMeasurer: TextMeasurer
  domOrder: number
}

type TaffyLayoutTree = {
  root: bigint
  state: TaffyLayoutState
}

type ClipBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

type SimpleTableLayout = {
  width: number
  height: number
  caption?: SimpleTableCaptionLayout
  columnGroups: SimpleTableColumnGroupLayout[]
  sections: SimpleTableSectionLayout[]
}

type SimpleTableCaptionLayout = {
  element: Element
  x: number
  y: number
  width: number
  height: number
}

type SimpleTableSectionLayout = {
  element: Element
  x: number
  y: number
  width: number
  height: number
  rows: SimpleTableRowLayout[]
}

type SimpleTableRowLayout = {
  element: Element
  x: number
  y: number
  width: number
  height: number
  cells: SimpleTableCellLayout[]
}

type SimpleTableColumnGroupLayout = {
  element: Element
  x: number
  y: number
  width: number
  height: number
  columns: SimpleTableColumnLayout[]
}

type SimpleTableColumnLayout = {
  element: Element
  x: number
  y: number
  width: number
  height: number
}

type SimpleTableCellLayout = {
  element: Element
  x: number
  y: number
  width: number
  height: number
}

type SimpleTableCellInput = {
  element: Element
  colSpan: number
  rowSpan: number
}

type SimpleTableCellPlacement = SimpleTableCellInput & {
  columnIndex: number
  rowIndex: number
}

type SimpleTableColumnInput = {
  element: Element
  span: number
}

type SimpleTableColumnPlacement = SimpleTableColumnInput & {
  columnIndex: number
}

type SimpleTableSpanConstraint = {
  startIndex: number
  span: number
  size: number
}

type SimpleTableRowSpanConstraint = {
  startIndex: number
  span: number
  size: number
}

let taffyLoadPromise: Promise<unknown> | undefined

const nonRenderedHtmlElements = new Set(['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title', 'wbr'])

export async function loadTaffyBackend(): Promise<void> {
  taffyLoadPromise ??= loadTaffy()
  await taffyLoadPromise
}

export function computeTaffyDocumentLayout(
  document: Document,
  viewport: Viewport,
  scroll: ScrollOffset,
  policy: UnsupportedCssPolicy | undefined,
  textMeasurer: TextMeasurer,
  stylesheets: readonly string[],
): LayoutSnapshot {
  const layoutTree = buildTaffyLayoutTree(document, viewport, policy, textMeasurer, stylesheets)
  computeTaffyLayout(layoutTree, viewport)
  return collectTaffyLayoutSnapshot(document, scroll, layoutTree.state)
}

function buildTaffyLayoutTree(
  document: Document,
  viewport: Viewport,
  policy: UnsupportedCssPolicy | undefined,
  textMeasurer: TextMeasurer,
  stylesheets: readonly string[],
): TaffyLayoutTree {
  const tree = new TaffyTree()
  const state: TaffyLayoutState = {
    boxes: [],
    rects: new Map<Element, Box>(),
    clientRects: new Map<Element, Box>(),
    elementScrolls: new Map<Element, ScrollOffset>(),
    elementNodes: new Map<Element, bigint>(),
    contentsElements: new Set<Element>(),
    tableLayouts: new Map<Element, SimpleTableLayout>(),
    styles: new WeakMap<Element, SupportedStyle>(),
    tree,
    rules: readStyleRules(document, policy, stylesheets),
    policy,
    textMeasurer,
    domOrder: 0,
  }

  const rootStyle = new Style()
  rootStyle.display = Display.Block
  rootStyle.size = { width: viewport.width, height: viewport.height }

  const root = tree.newWithChildren(rootStyle, buildChildNodes(document.body, state))

  return { root, state }
}

function computeTaffyLayout(layoutTree: TaffyLayoutTree, viewport: Viewport): void {
  layoutTree.state.tree.computeLayoutWithMeasure(
    layoutTree.root,
    { width: viewport.width, height: viewport.height },
    measureTaffyNode,
  )
}

function collectTaffyLayoutSnapshot(document: Document, scroll: ScrollOffset, state: TaffyLayoutState): LayoutSnapshot {
  recordChildLayouts(document.body, { x: 0, y: 0 }, infiniteClipBounds(), scroll, false, false, state)

  return { boxes: state.boxes, rects: state.rects, clientRects: state.clientRects, elementScrolls: state.elementScrolls }
}

function buildChildNodes(parent: Element | null, state: TaffyLayoutState): bigint[] {
  if (!parent) {
    return []
  }

  return renderedElementChildren(parent, state)
    .flatMap((element) => buildNodesForElement(element, state))
}

function buildNodesForElement(element: Element, state: TaffyLayoutState): bigint[] {
  const style = resolveSupportedStyle(element, state)

  if (isHidden(element) || style.display === 'none') {
    markSubtreeDisplayNone(element, state)
    return []
  }

  if (style.display === 'contents') {
    // display: contents removes the element's own principal box while its
    // children participate in the parent's Taffy formatting context.
    markElementNoBox(element, state)
    state.contentsElements.add(element)
    return buildChildNodes(element, state)
  }

  const tableLayout = createSimpleTableLayout(element, state)
  if (tableLayout) {
    state.tableLayouts.set(element, tableLayout)
    const context = createReplacedMeasureContext(style, tableLayout.width, tableLayout.height, state.textMeasurer)
    const node = state.tree.newLeafWithContext(toTaffyStyle(style, context), context)
    state.elementNodes.set(element, node)
    return [node]
  }

  const context = createMeasureContext(element, style, state.textMeasurer)
  const children = context?.replacedSize || canMeasureTextLeaf(element) ? [] : buildChildNodes(element, state)
  const taffyStyle = toTaffyStyle(style, context)
  const node =
    children.length === 0 && context
      ? state.tree.newLeafWithContext(taffyStyle, context)
      : state.tree.newWithChildren(taffyStyle, children)

  state.elementNodes.set(element, node)
  return [node]
}

function recordChildLayouts(
  parent: Element | null,
  origin: { x: number; y: number },
  clipBounds: ClipBounds,
  scroll: ScrollOffset,
  fixedContainingBlock: boolean,
  suppressedByHiddenUntilFound: boolean,
  state: TaffyLayoutState,
): void {
  if (!parent) {
    return
  }

  for (const element of renderedElementChildren(parent, state)) {
    const node = state.elementNodes.get(element)

    if (!node) {
      if (state.contentsElements.has(element)) {
        markElementNoBox(element, state)
        recordChildLayouts(element, origin, clipBounds, scroll, fixedContainingBlock, suppressedByHiddenUntilFound, state)
      }

      continue
    }

    const style = resolveSupportedStyle(element, state)
    const fixedSubtree = fixedContainingBlock || style.position === 'fixed'
    const layout = state.tree.getLayout(node)
    // Taffy models fixed as absolute, so collection re-roots fixed boxes to
    // viewport coordinates instead of inheriting a scrolled ancestor origin.
    const layoutBox = {
      x: style.position === 'fixed' ? layout.x : origin.x + layout.x,
      y: style.position === 'fixed' ? layout.y : origin.y + layout.y,
      width: layout.width,
      height: layout.height,
    }
    const box = toViewportBox(layoutBox, scroll, fixedSubtree)
    const domOrder = state.domOrder
    state.domOrder += 1

    const elementScroll = readElementScrollOffset(element)
    const hitClipBounds = style.position === 'fixed' ? infiniteClipBounds() : clipBounds
    state.elementScrolls.set(element, elementScroll)
    recordBox(element, style, box, hitClipBounds, domOrder, !suppressedByHiddenUntilFound, state)
    const tableLayout = state.tableLayouts.get(element)
    if (tableLayout) {
      recordSimpleTableLayout(tableLayout, box, hitClipBounds, state)
      continue
    }

    recordChildLayouts(
      element,
      {
        x: layoutBox.x - elementScroll.x,
        y: layoutBox.y - elementScroll.y,
      },
      childClipBounds(style, box, hitClipBounds),
      scroll,
      fixedSubtree,
      suppressedByHiddenUntilFound || isHiddenUntilFound(element),
      state,
    )
  }
}

function toViewportBox(box: Box, scroll: ScrollOffset, fixedSubtree: boolean): Box {
  if (fixedSubtree) {
    return box
  }

  return {
    x: box.x - scroll.x,
    y: box.y - scroll.y,
    width: box.width,
    height: box.height,
  }
}

function readElementScrollOffset(element: Element): ScrollOffset {
  return {
    x: element.scrollLeft,
    y: element.scrollTop,
  }
}

function markElementNoBox(element: Element, state: TaffyLayoutState): void {
  state.rects.set(element, { x: 0, y: 0, width: 0, height: 0 })
  state.clientRects.set(element, { x: 0, y: 0, width: 0, height: 0 })
  state.elementScrolls.set(element, readElementScrollOffset(element))
}

function markSubtreeDisplayNone(element: Element, state: TaffyLayoutState): void {
  markElementNoBox(element, state)

  for (const child of elementChildren(element)) {
    markSubtreeDisplayNone(child, state)
  }
}

function recordSimpleTableLayout(
  tableLayout: SimpleTableLayout,
  tableBox: Box,
  clipBounds: ClipBounds,
  state: TaffyLayoutState,
): void {
  if (tableLayout.caption) {
    const captionStyle = resolveSupportedStyle(tableLayout.caption.element, state)
    const captionBox = offsetTableBox(tableBox, tableLayout.caption)
    state.elementScrolls.set(tableLayout.caption.element, readElementScrollOffset(tableLayout.caption.element))
    recordBox(tableLayout.caption.element, captionStyle, captionBox, clipBounds, nextDomOrder(state), true, state)
  }

  for (const columnGroup of tableLayout.columnGroups) {
    const columnGroupStyle = resolveSupportedStyle(columnGroup.element, state)
    const columnGroupBox = offsetTableBox(tableBox, columnGroup)
    state.elementScrolls.set(columnGroup.element, readElementScrollOffset(columnGroup.element))
    recordBox(columnGroup.element, columnGroupStyle, columnGroupBox, clipBounds, nextDomOrder(state), false, state)

    for (const column of columnGroup.columns) {
      const columnStyle = resolveSupportedStyle(column.element, state)
      const columnBox = offsetTableBox(tableBox, column)
      state.elementScrolls.set(column.element, readElementScrollOffset(column.element))
      recordBox(column.element, columnStyle, columnBox, clipBounds, nextDomOrder(state), false, state)
    }
  }

  for (const section of tableLayout.sections) {
    const sectionStyle = resolveSupportedStyle(section.element, state)
    const sectionBox = offsetTableBox(tableBox, section)
    state.elementScrolls.set(section.element, readElementScrollOffset(section.element))
    recordBox(section.element, sectionStyle, sectionBox, clipBounds, nextDomOrder(state), false, state)

    for (const row of section.rows) {
      const rowStyle = resolveSupportedStyle(row.element, state)
      const rowBox = offsetTableBox(tableBox, row)
      state.elementScrolls.set(row.element, readElementScrollOffset(row.element))
      recordBox(row.element, rowStyle, rowBox, clipBounds, nextDomOrder(state), false, state)

      for (const cell of row.cells) {
        const cellStyle = resolveSupportedStyle(cell.element, state)
        const cellBox = offsetTableBox(tableBox, cell)
        const includeHitBox = tableCellIncludesHitBox(cell.element, cellStyle, state)
        state.elementScrolls.set(cell.element, readElementScrollOffset(cell.element))
        recordBox(cell.element, cellStyle, cellBox, clipBounds, nextDomOrder(state), includeHitBox, state)
      }
    }
  }
}

function offsetTableBox(origin: Box, box: { x: number; y: number; width: number; height: number }): Box {
  return {
    x: origin.x + box.x,
    y: origin.y + box.y,
    width: box.width,
    height: box.height,
  }
}

function tableCellIncludesHitBox(element: Element, style: SupportedStyle, state: TaffyLayoutState): boolean {
  const table = closestAncestorTable(element)
  const tableStyle = table ? resolveSupportedStyle(table, state) : undefined
  const emptyCells = style.emptyCells ?? tableStyle?.emptyCells ?? 'show'

  return emptyCells !== 'hide' || element.textContent?.trim() !== ''
}

function nextDomOrder(state: TaffyLayoutState): number {
  const domOrder = state.domOrder
  state.domOrder += 1
  return domOrder
}

function recordBox(
  element: Element,
  style: SupportedStyle,
  box: Box,
  clipBounds: ClipBounds,
  domOrder: number,
  includeHitBox: boolean,
  state: TaffyLayoutState,
): void {
  state.rects.set(element, box)
  state.clientRects.set(element, computeClientBox(box, style))

  if (!includeHitBox) {
    return
  }

  const hitBox = clipBox(box, clipBounds)

  if (!hitBox || hitBox.width <= 0 || hitBox.height <= 0) {
    return
  }

  state.boxes.push({
    ...hitBox,
    element,
    zIndex: style.zIndex,
    domOrder,
    pointerEvents: style.pointerEvents,
    visibility: style.visibility,
  })
}

function childClipBounds(style: SupportedStyle, box: Box, clipBounds: ClipBounds): ClipBounds {
  const clientBox = computeClientBox(box, style)

  return {
    left: style.overflowX === 'visible' ? clipBounds.left : Math.max(clipBounds.left, clientBox.x),
    right:
      style.overflowX === 'visible'
        ? clipBounds.right
        : Math.min(clipBounds.right, clientBox.x + clientBox.width),
    top: style.overflowY === 'visible' ? clipBounds.top : Math.max(clipBounds.top, clientBox.y),
    bottom:
      style.overflowY === 'visible'
        ? clipBounds.bottom
        : Math.min(clipBounds.bottom, clientBox.y + clientBox.height),
  }
}

function clipBox(box: Box, clipBounds: ClipBounds): Box | undefined {
  const x = Math.max(box.x, clipBounds.left)
  const y = Math.max(box.y, clipBounds.top)
  const right = Math.min(box.x + box.width, clipBounds.right)
  const bottom = Math.min(box.y + box.height, clipBounds.bottom)
  const width = right - x
  const height = bottom - y

  return width > 0 && height > 0 ? { x, y, width, height } : undefined
}

function infiniteClipBounds(): ClipBounds {
  return {
    left: Number.NEGATIVE_INFINITY,
    right: Number.POSITIVE_INFINITY,
    top: Number.NEGATIVE_INFINITY,
    bottom: Number.POSITIVE_INFINITY,
  }
}

function computeClientBox(box: Box, style: SupportedStyle): Box {
  const border = effectiveBorderWidth(style)

  return {
    x: box.x + border.left,
    y: box.y + border.top,
    width: Math.max(0, box.width - horizontal(border)),
    height: Math.max(0, box.height - vertical(border)),
  }
}

function resolveSupportedStyle(element: Element, state: TaffyLayoutState): SupportedStyle {
  const cached = state.styles.get(element)

  if (cached) {
    return cached
  }

  const style = createDefaultStyle()
  applyUserAgentDefaults(style, element)
  applyStyleRules(style, element, state.rules, state.policy)
  applyInlineStyle(style, element, state.policy)
  applyPostAuthorUserAgentDefaults(style, element)
  state.styles.set(element, style)
  return style
}

function createSimpleTableLayout(element: Element, state: TaffyLayoutState): SimpleTableLayout | undefined {
  if (element.tagName.toLowerCase() !== 'table') {
    return undefined
  }

  const sections = tableSectionElements(element)
  const rowElements = sections.map((section) => tableRowElements(section))
  const rowCells = rowElements.map((rows) => rows.map((row) => tableCellInputs(row)))
  const rowPlacements = rowCells.map(createTableCellPlacements)
  const columnGroups = tableColumnGroups(element)
  const columnPlacements = columnGroups.map((group) => tableColumnPlacements(group))
  const tableColumnCount = Math.max(0, ...columnPlacements.flatMap((columns) =>
    columns.map((column) => column.columnIndex + column.span)
  ))
  const rowColumnCount = Math.max(0, ...rowPlacements.flatMap((rows) =>
    rows.flatMap((cells) => cells.map((cell) => cell.columnIndex + cell.colSpan))
  ))
  const columnCount = Math.max(tableColumnCount, rowColumnCount)

  if (sections.length === 0 || columnCount === 0) {
    return undefined
  }

  const columnWidths = Array.from({ length: columnCount }, () => 0)
  const rowHeights = rowElements.map((rows) => rows.map(() => 0))
  const collapsedColumns = tableCollapsedColumns(columnPlacements, columnCount, state)
  const collapsedRows = rowElements.map((rows, sectionIndex) =>
    rows.map((row) => {
      const sectionStyle = resolveSupportedStyle(sections[sectionIndex], state)
      const rowStyle = resolveSupportedStyle(row, state)
      return sectionStyle.visibility === 'collapse' || rowStyle.visibility === 'collapse'
    })
  )
  const columnSpanConstraints: SimpleTableSpanConstraint[] = []
  const rowSpanConstraints = rowElements.map((): SimpleTableRowSpanConstraint[] => [])
  const tableStyle = resolveSupportedStyle(element, state)
  const isCollapsedBorderTable = tableStyle.borderCollapse === 'collapse'
  const horizontalSpacing = isCollapsedBorderTable ? 0 : tableStyle.tableBorderSpacing.horizontal
  const verticalSpacing = isCollapsedBorderTable ? 0 : tableStyle.tableBorderSpacing.vertical
  const collapsedBorderInset = isCollapsedBorderTable ? tableCollapsedBorderInset(rowPlacements, state) : zeroEdges()
  const captionElement = tableCaptionElement(element)
  const captionStyle = captionElement ? resolveSupportedStyle(captionElement, state) : undefined
  const captionWidth = captionStyle ? tableCaptionOuterWidth(captionStyle) : 0
  const captionHeight = captionStyle ? tableCaptionOuterHeight(captionStyle) : 0
  const captionSide = captionStyle?.captionSide ?? 'top'

  for (const columns of columnPlacements) {
    for (const column of columns) {
      const columnStyle = resolveSupportedStyle(column.element, state)
      const columnWidth = numericDimension(columnStyle.width)

      for (let offset = 0; offset < column.span; offset += 1) {
        columnWidths[column.columnIndex + offset] = Math.max(columnWidths[column.columnIndex + offset], columnWidth)
      }
    }
  }

  for (const [sectionIndex, rows] of rowElements.entries()) {
    for (const rowIndex of rows.keys()) {
      for (const cell of rowPlacements[sectionIndex][rowIndex]) {
        const cellStyle = resolveSupportedStyle(cell.element, state)
        const cellSize = tableCellOuterSize(cellStyle, isCollapsedBorderTable)
        if (cell.colSpan === 1) {
          columnWidths[cell.columnIndex] = Math.max(columnWidths[cell.columnIndex], cellSize.width)
        } else {
          columnSpanConstraints.push({ startIndex: cell.columnIndex, span: cell.colSpan, size: cellSize.width })
        }
        if (cell.rowSpan === 1) {
          rowHeights[sectionIndex][rowIndex] = Math.max(rowHeights[sectionIndex][rowIndex], cellSize.height)
        } else {
          rowSpanConstraints[sectionIndex].push({ startIndex: rowIndex, span: cell.rowSpan, size: cellSize.height })
        }
      }
    }
  }

  applyTableSpanConstraints(columnWidths, columnSpanConstraints, horizontalSpacing)
  applyExplicitTableWidth(columnWidths, Math.max(numericDimension(tableStyle.width), captionWidth), horizontalSpacing)
  for (const [index, collapsed] of collapsedColumns.entries()) {
    if (collapsed) {
      columnWidths[index] = 0
    }
  }
  for (const [sectionIndex, constraints] of rowSpanConstraints.entries()) {
    applyTableSpanConstraints(rowHeights[sectionIndex], constraints, verticalSpacing)
  }
  for (const [sectionIndex, rows] of collapsedRows.entries()) {
    for (const [rowIndex, collapsed] of rows.entries()) {
      if (collapsed) {
        rowHeights[sectionIndex][rowIndex] = 0
      }
    }
  }

  applyExplicitTableHeight(rowHeights, numericDimension(tableStyle.height), captionHeight, verticalSpacing)
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0) +
    (isCollapsedBorderTable ? horizontal(collapsedBorderInset) : horizontalSpacing * (columnCount + 1))
  const leadingX = isCollapsedBorderTable ? collapsedBorderInset.left : horizontalSpacing
  const leadingY = isCollapsedBorderTable ? collapsedBorderInset.top : verticalSpacing
  const trailingY = isCollapsedBorderTable ? collapsedBorderInset.bottom : 0
  let y = (captionSide === 'top' ? captionHeight : 0) + leadingY
  const sectionLayouts: SimpleTableSectionLayout[] = []

  for (const [sectionIndex, section] of sections.entries()) {
    const rows = rowElements[sectionIndex]
    const sectionY = y
    const rowLayouts: SimpleTableRowLayout[] = []

    for (const [rowIndex, row] of rows.entries()) {
      const rowHeight = rowHeights[sectionIndex][rowIndex]
      const cellLayouts: SimpleTableCellLayout[] = []

      for (const cell of rowPlacements[sectionIndex][rowIndex]) {
        const x = tableTrackOffset(columnWidths, cell.columnIndex, horizontalSpacing, leadingX)
        const width = spannedTracksSize(columnWidths, cell.columnIndex, cell.colSpan, horizontalSpacing)
        const height = spannedTracksSize(rowHeights[sectionIndex], rowIndex, cell.rowSpan, verticalSpacing)
        cellLayouts.push({ element: cell.element, x, y, width, height })
      }

      rowLayouts.push({
        element: row,
        x: leadingX,
        y,
        width: tableWidth - horizontal(collapsedBorderInset) - horizontalSpacing * (isCollapsedBorderTable ? 0 : 2),
        height: rowHeight,
        cells: cellLayouts,
      })
      y += rowHeight + verticalSpacing
    }

    sectionLayouts.push({
      element: section,
      x: leadingX,
      y: sectionY,
      width: tableWidth - horizontal(collapsedBorderInset) - horizontalSpacing * (isCollapsedBorderTable ? 0 : 2),
      height: y - sectionY - verticalSpacing,
      rows: rowLayouts,
    })
  }
  const tableLayoutBottom = y + trailingY
  const tableBodyTop = (captionSide === 'top' ? captionHeight : 0) + leadingY
  const tableBodyHeight = y - tableBodyTop
  const columnGroupLayouts = columnGroups.map((group, groupIndex): SimpleTableColumnGroupLayout => {
    const columns = columnPlacements[groupIndex]
    const startColumn = Math.min(...columns.map((column) => column.columnIndex))
    const endColumn = Math.max(...columns.map((column) => column.columnIndex + column.span))
    const x = tableTrackOffset(columnWidths, startColumn, horizontalSpacing, leadingX)
    const width = spannedTracksSize(columnWidths, startColumn, endColumn - startColumn, horizontalSpacing)

    return {
      element: group,
      x,
      y: tableBodyTop,
      width,
      height: tableBodyHeight,
      columns: columns.map((column) => ({
        element: column.element,
        x: tableTrackOffset(columnWidths, column.columnIndex, horizontalSpacing, leadingX),
        y: tableBodyTop,
        width: spannedTracksSize(columnWidths, column.columnIndex, column.span, horizontalSpacing),
        height: tableColumnIsCollapsed(collapsedColumns, column.columnIndex, column.span) ? 0 : tableBodyHeight,
      })),
    }
  })

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
  }
}

function tableCaptionElement(table: Element): Element | undefined {
  return Array.from(table.children).find((child) => child.tagName.toLowerCase() === 'caption')
}

function tableColumnGroups(table: Element): Element[] {
  return Array.from(table.children).filter((child) =>
    child.tagName.toLowerCase() === 'colgroup' && tableColumnElements(child).length > 0
  )
}

function tableColumnElements(columnGroup: Element): Element[] {
  return Array.from(columnGroup.children).filter((child) => child.tagName.toLowerCase() === 'col')
}

function tableColumnPlacements(columnGroup: Element): SimpleTableColumnPlacement[] {
  let columnIndex = 0

  return tableColumnElements(columnGroup).map((element) => {
    const span = tableColumnElementSpan(element)
    const placement = { element, span, columnIndex }
    columnIndex += span
    return placement
  })
}

function tableCollapsedColumns(
  columnPlacements: SimpleTableColumnPlacement[][],
  columnCount: number,
  state: TaffyLayoutState,
): boolean[] {
  const collapsed = Array.from({ length: columnCount }, () => false)

  for (const columns of columnPlacements) {
    for (const column of columns) {
      const columnStyle = resolveSupportedStyle(column.element, state)
      const parentStyle = column.element.parentElement
        ? resolveSupportedStyle(column.element.parentElement, state)
        : undefined

      if (columnStyle.visibility !== 'collapse' && parentStyle?.visibility !== 'collapse') {
        continue
      }

      for (let offset = 0; offset < column.span; offset += 1) {
        collapsed[column.columnIndex + offset] = true
      }
    }
  }

  return collapsed
}

function tableColumnIsCollapsed(collapsedColumns: boolean[], columnIndex: number, span: number): boolean {
  return collapsedColumns
    .slice(columnIndex, columnIndex + span)
    .every((collapsed) => collapsed)
}

function tableColumnElementSpan(column: Element): number {
  const attr = column.getAttribute('span')

  if (!attr) {
    return 1
  }

  const value = Number(attr)
  return Number.isInteger(value) && value > 0 ? Math.min(value, 1000) : 1
}

function tableSectionElements(table: Element): Element[] {
  const sections = Array.from(table.children).filter((child) =>
    ['tbody', 'thead', 'tfoot'].includes(child.tagName.toLowerCase()),
  )

  return sections.length > 0 ? sections.sort((a, b) => tableSectionOrder(a) - tableSectionOrder(b)) : [table]
}

function tableSectionOrder(section: Element): number {
  switch (section.tagName.toLowerCase()) {
    case 'thead':
      return 0
    case 'tfoot':
      return 2
    default:
      return 1
  }
}

function tableRowElements(section: Element): Element[] {
  return Array.from(section.children).filter((child) => child.tagName.toLowerCase() === 'tr')
}

function tableCellElements(row: Element): Element[] {
  return Array.from(row.children).filter((child) => {
    const tagName = child.tagName.toLowerCase()
    return tagName === 'td' || tagName === 'th'
  })
}

function tableCellInputs(row: Element): SimpleTableCellInput[] {
  return tableCellElements(row).map((element) => ({
    element,
    colSpan: tableColumnSpan(element),
    rowSpan: tableRowSpan(element),
  }))
}

function createTableCellPlacements(rows: SimpleTableCellInput[][]): SimpleTableCellPlacement[][] {
  const activeRowSpans: number[] = []

  return rows.map((cells, rowIndex) => {
    const placements: SimpleTableCellPlacement[] = []
    let columnIndex = 0

    for (const cell of cells) {
      while ((activeRowSpans[columnIndex] ?? 0) > 0) {
        columnIndex += 1
      }

      placements.push({ ...cell, columnIndex, rowIndex })

      for (let offset = 0; offset < cell.colSpan; offset += 1) {
        activeRowSpans[columnIndex + offset] = Math.max(activeRowSpans[columnIndex + offset] ?? 0, cell.rowSpan)
      }

      columnIndex += cell.colSpan
    }

    for (let index = 0; index < activeRowSpans.length; index += 1) {
      activeRowSpans[index] = Math.max(0, (activeRowSpans[index] ?? 0) - 1)
    }

    return placements
  })
}

function tableColumnSpan(cell: Element): number {
  const attr = cell.getAttribute('colspan')

  if (!attr) {
    return 1
  }

  const value = Number(attr)
  return Number.isInteger(value) && value > 0 ? Math.min(value, 1000) : 1
}

function tableRowSpan(cell: Element): number {
  const attr = cell.getAttribute('rowspan')

  if (!attr) {
    return 1
  }

  const value = Number(attr)
  return Number.isInteger(value) && value > 0 ? Math.min(value, 65534) : 1
}

function applyTableSpanConstraints(
  trackSizes: number[],
  constraints: SimpleTableSpanConstraint[],
  trackSpacing: number,
): void {
  for (const constraint of constraints) {
    const tracks = trackSizes.slice(constraint.startIndex, constraint.startIndex + constraint.span)
    const currentSize = tracks.reduce((sum, size) => sum + size, 0)
    const targetSize = Math.max(0, constraint.size - trackSpacing * (constraint.span - 1))

    if (currentSize >= targetSize) {
      continue
    }

    const extraSize = targetSize - currentSize

    if (currentSize === 0) {
      const extraPerTrack = extraSize / tracks.length

      for (let index = constraint.startIndex; index < constraint.startIndex + constraint.span; index += 1) {
        trackSizes[index] += extraPerTrack
      }

      continue
    }

    for (let offset = 0; offset < tracks.length; offset += 1) {
      trackSizes[constraint.startIndex + offset] += extraSize * (tracks[offset] / currentSize)
    }
  }
}

function applyExplicitTableWidth(columnWidths: number[], explicitWidth: number, horizontalSpacing: number): void {
  if (explicitWidth <= 0 || columnWidths.length === 0) {
    return
  }

  const currentTrackWidth = columnWidths.reduce((sum, width) => sum + width, 0)
  const targetTrackWidth = Math.max(0, explicitWidth - horizontalSpacing * (columnWidths.length + 1))

  if (currentTrackWidth === targetTrackWidth) {
    return
  }

  if (currentTrackWidth === 0) {
    const width = targetTrackWidth / columnWidths.length

    for (let index = 0; index < columnWidths.length; index += 1) {
      columnWidths[index] = width
    }

    return
  }

  const scale = targetTrackWidth / currentTrackWidth

  for (let index = 0; index < columnWidths.length; index += 1) {
    columnWidths[index] *= scale
  }
}

function applyExplicitTableHeight(
  rowHeights: number[][],
  explicitHeight: number,
  captionHeight: number,
  verticalSpacing: number,
): void {
  const rows = rowHeights.flat()

  if (explicitHeight <= 0 || rows.length === 0) {
    return
  }

  const currentRowsHeight = rows.reduce((sum, height) => sum + height, 0)
  const targetRowsHeight = Math.max(0, explicitHeight - captionHeight - verticalSpacing * (rows.length + 1))

  if (currentRowsHeight === targetRowsHeight) {
    return
  }

  if (currentRowsHeight === 0) {
    const height = targetRowsHeight / rows.length

    for (const sectionRows of rowHeights) {
      for (let index = 0; index < sectionRows.length; index += 1) {
        sectionRows[index] = height
      }
    }

    return
  }

  const scale = targetRowsHeight / currentRowsHeight

  for (const sectionRows of rowHeights) {
    for (let index = 0; index < sectionRows.length; index += 1) {
      sectionRows[index] *= scale
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
    .reduce((sum, size) => sum + size, 0)

  return leadingOffset + precedingTracks + trackSpacing * trackIndex
}

function spannedTracksSize(
  trackSizes: number[],
  trackIndex: number,
  span: number,
  trackSpacing: number,
): number {
  if (span <= 0) {
    return 0
  }

  const trackSize = trackSizes
    .slice(trackIndex, trackIndex + span)
    .reduce((sum, size) => sum + size, 0)

  return trackSize + trackSpacing * Math.max(0, span - 1)
}

function numericDimension(value: SupportedStyle['width']): number {
  return typeof value === 'number' ? value : 0
}

function tableCaptionOuterWidth(style: SupportedStyle): number {
  const border = effectiveBorderWidth(style)
  const horizontalBox = numericDimension(style.padding.left) +
    numericDimension(style.padding.right) +
    border.left +
    border.right

  return style.boxSizing === 'border-box'
    ? numericDimension(style.width)
    : numericDimension(style.width) + horizontalBox
}

function tableCaptionOuterHeight(style: SupportedStyle): number {
  const border = effectiveBorderWidth(style)
  const verticalBox = numericDimension(style.padding.top) +
    numericDimension(style.padding.bottom) +
    border.top +
    border.bottom

  return style.boxSizing === 'border-box'
    ? numericDimension(style.height)
    : numericDimension(style.height) + verticalBox
}

function tableCellOuterSize(style: SupportedStyle, isCollapsedBorderTable: boolean): { width: number; height: number } {
  const border = effectiveBorderWidth(style)
  const horizontalBorder = isCollapsedBorderTable ? horizontal(border) / 2 : horizontal(border)
  const verticalBorder = isCollapsedBorderTable ? vertical(border) / 2 : vertical(border)
  const horizontalBox = numericDimension(style.padding.left) +
    numericDimension(style.padding.right) +
    horizontalBorder
  const verticalBox = numericDimension(style.padding.top) +
    numericDimension(style.padding.bottom) +
    verticalBorder

  if (style.boxSizing === 'border-box') {
    return {
      width: numericDimension(style.width),
      height: numericDimension(style.height),
    }
  }

  // Chromium's fixed explicit table-cell dimensions are asymmetric here:
  // width contributes as content width plus padding/border, while height
  // contributes as an outer row height floor rather than content plus box.
  return {
    width: numericDimension(style.width) + horizontalBox,
    height: Math.max(numericDimension(style.height), verticalBox),
  }
}

function tableCollapsedBorderInset(
  rowPlacements: SimpleTableCellPlacement[][][],
  state: TaffyLayoutState,
): Edges {
  const inset = zeroEdges()

  for (const section of rowPlacements) {
    for (const row of section) {
      for (const cell of row) {
        const border = effectiveBorderWidth(resolveSupportedStyle(cell.element, state))
        inset.top = Math.max(inset.top, border.top / 2)
        inset.right = Math.max(inset.right, border.right / 2)
        inset.bottom = Math.max(inset.bottom, border.bottom / 2)
        inset.left = Math.max(inset.left, border.left / 2)
      }
    }
  }

  return inset
}

function tableBorderSpacingDefault(table: Element): { horizontal: number; vertical: number } {
  const cellSpacing = nonNegativeAttributeNumber(table, 'cellspacing')

  if (cellSpacing === undefined) {
    return { horizontal: 2, vertical: 2 }
  }

  return { horizontal: cellSpacing, vertical: cellSpacing }
}

function applyTableDimensionAttributes(style: SupportedStyle, element: Element): void {
  const width = nonNegativeAttributeNumber(element, 'width')
  const height = nonNegativeAttributeNumber(element, 'height')

  style.width = width ?? style.width
  style.height = height ?? style.height
}

function applyTableCellPaddingDefault(style: SupportedStyle, cell: Element): void {
  const table = closestAncestorTable(cell)
  const cellPadding = table ? nonNegativeAttributeNumber(table, 'cellpadding') : undefined

  if (cellPadding === undefined) {
    return
  }

  style.padding.top = cellPadding
  style.padding.right = cellPadding
  style.padding.bottom = cellPadding
  style.padding.left = cellPadding
}

function closestAncestorTable(element: Element): Element | undefined {
  let current = element.parentElement

  while (current) {
    if (current.tagName.toLowerCase() === 'table') {
      return current
    }

    current = current.parentElement
  }

  return undefined
}

function nonNegativeAttributeNumber(element: Element, attribute: string): number | undefined {
  const value = element.getAttribute(attribute)

  if (value === null || value.trim() === '') {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
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
    lineHeight: style.lineHeight,
    whiteSpace: style.whiteSpace,
    textMeasurer,
    replacedSize: { width, height },
  }
}

function applyUserAgentDefaults(style: SupportedStyle, element: Element): void {
  switch (element.tagName.toLowerCase()) {
    case 'ul':
    case 'ol':
    case 'menu':
      style.margin.top = 16
      style.margin.bottom = 16
      style.padding.left = 40
      return
    case 'dl':
      style.margin.top = 16
      style.margin.bottom = 16
      return
    case 'dd':
      style.margin.left = 40
      return
    case 'p':
      applyBlockTextDefaults(style, 16, 20, 16, 16)
      return
    case 'blockquote':
      applyBlockTextDefaults(style, 16, 20, 16, 16)
      style.margin.left = 40
      style.margin.right = 40
      return
    case 'address':
      style.fontFamily = 'Times New Roman'
      style.fontSize = 16
      style.lineHeight = 20
      return
    case 'figure':
      style.margin.top = 16
      style.margin.right = 40
      style.margin.bottom = 16
      style.margin.left = 40
      return
    case 'pre':
      applyBlockTextDefaults(style, 13, 17, 13, 13)
      style.fontFamily = 'monospace'
      style.whiteSpace = 'pre'
      return
    case 'hr':
      style.height = 0
      style.margin.top = 8
      style.margin.bottom = 8
      applyBorderDefaults(style, 'inset', 1)
      return
    case 'dialog':
      style.position = 'absolute'
      style.zIndex = 1
      style.margin.top = 'auto'
      style.margin.right = 'auto'
      style.margin.bottom = 'auto'
      style.margin.left = 'auto'
      style.padding.top = 16
      style.padding.right = 16
      style.padding.bottom = 16
      style.padding.left = 16
      applyBorderDefaults(style, 'solid', 3)
      if (!element.hasAttribute('open')) {
        style.display = 'none'
      }
      return
    case 'table':
      applyTableDimensionAttributes(style, element)
      style.tableBorderSpacing = tableBorderSpacingDefault(element)
      return
    case 'col':
      applyTableDimensionAttributes(style, element)
      return
    case 'td':
    case 'th':
      applyTableDimensionAttributes(style, element)
      applyTableCellPaddingDefault(style, element)
      return
    case 'iframe':
      applyBorderDefaults(style, 'inset', 2)
      return
    case 'object':
      applyObjectFallbackAttributes(style, element)
      return
    case 'h1':
      applyHeadingDefaults(style, 32, 40, 21.44)
      return
    case 'h2':
      applyHeadingDefaults(style, 24, 30, 19.92)
      return
    case 'h3':
      applyHeadingDefaults(style, 18.72, 23, 18.72)
      return
    case 'h4':
      applyHeadingDefaults(style, 16, 20, 21.28)
      return
    case 'h5':
      applyHeadingDefaults(style, 13.28, 17, 22.1776)
      return
    case 'h6':
      applyHeadingDefaults(style, 10.72, 14, 24.9776)
      return
    case 'button':
      applyFormControlBoxDefaults(style, 'outset', 2)
      style.padding.top = 1
      style.padding.right = 6
      style.padding.bottom = 1
      style.padding.left = 6
      return
    case 'input':
      applyInputUserAgentDefaults(style, element)
      return
    case 'textarea':
      applyFormControlBoxDefaults(style, 'solid', 1)
      style.padding.top = 2
      style.padding.right = 2
      style.padding.bottom = 2
      style.padding.left = 2
      return
    case 'select':
      applyFormControlBoxDefaults(style, 'solid', 1)
      return
  }
}

function applyPostAuthorUserAgentDefaults(style: SupportedStyle, element: Element): void {
  if (element.tagName.toLowerCase() === 'input' && (element.getAttribute('type') ?? 'text').toLowerCase() === 'hidden') {
    // Chromium keeps hidden inputs non-rendered even when author CSS sets
    // display:block, so this UA constraint has to run after author styles.
    style.display = 'none'
  }

  if (element.tagName.toLowerCase() === 'audio' && !element.hasAttribute('controls')) {
    // Audio elements without native controls do not generate a layout box in
    // Chromium, even when author CSS sets display:block.
    style.display = 'none'
  }
}

function applyBlockTextDefaults(
  style: SupportedStyle,
  fontSize: number,
  lineHeight: number,
  marginTop: number,
  marginBottom: number,
): void {
  style.fontFamily = 'Times New Roman'
  style.fontSize = fontSize
  style.lineHeight = lineHeight
  style.margin.top = marginTop
  style.margin.bottom = marginBottom
}

function applyHeadingDefaults(style: SupportedStyle, fontSize: number, lineHeight: number, blockMargin: number): void {
  applyBlockTextDefaults(style, fontSize, lineHeight, blockMargin, blockMargin)
}

function applyObjectFallbackAttributes(style: SupportedStyle, element: Element): void {
  if (!isObjectFallbackContentLayout(element)) {
    return
  }

  style.width = readNumberAttribute(element, 'width') ?? style.width
  style.height = readNumberAttribute(element, 'height') ?? style.height
}

function isObjectFallbackContentLayout(element: Element): boolean {
  return (
    element.tagName.toLowerCase() === 'object' &&
    !element.hasAttribute('type') &&
    !element.hasAttribute('data') &&
    Array.from(element.children).some((child) => child.tagName.toLowerCase() !== 'param')
  )
}

function applyInputUserAgentDefaults(style: SupportedStyle, element: Element): void {
  const type = (element.getAttribute('type') ?? 'text').toLowerCase()

  style.boxSizing = 'border-box'

  if (type === 'hidden') {
    style.display = 'none'
    return
  }

  if (type === 'file' || type === 'image') {
    return
  }

  if (type === 'checkbox') {
    style.margin.top = 3
    style.margin.right = 3
    style.margin.bottom = 3
    style.margin.left = 4
    return
  }

  if (type === 'radio') {
    style.margin.top = 3
    style.margin.right = 3
    style.margin.left = 5
    return
  }

  if (type === 'range') {
    style.margin.top = 2
    style.margin.left = 2
    style.margin.right = 2
    style.margin.bottom = 2
    return
  }

  if (type === 'color') {
    applyFormControlBoxDefaults(style, 'solid', 1)
    return
  }

  applyFormControlBoxDefaults(style, type === 'button' || type === 'submit' || type === 'reset' ? 'outset' : 'inset', 2)
  style.padding.top = 1
  style.padding.right = 2
  style.padding.bottom = 1
  style.padding.left = 2
}

function applyFormControlBoxDefaults(style: SupportedStyle, borderStyle: SupportedStyle['borderStyle']['top'], borderWidth: number): void {
  style.boxSizing = 'border-box'
  applyBorderDefaults(style, borderStyle, borderWidth)
}

function applyBorderDefaults(style: SupportedStyle, borderStyle: SupportedStyle['borderStyle']['top'], borderWidth: number): void {
  style.borderStyle.top = borderStyle
  style.borderStyle.right = borderStyle
  style.borderStyle.bottom = borderStyle
  style.borderStyle.left = borderStyle
  style.borderWidth.top = borderWidth
  style.borderWidth.right = borderWidth
  style.borderWidth.bottom = borderWidth
  style.borderWidth.left = borderWidth
}

function elementChildren(parent: Element): Element[] {
  return Array.from(parent.children).filter((element) => !isNonRenderedHtmlElement(element))
}

function renderedElementChildren(parent: Element, state: TaffyLayoutState): Element[] {
  const children = orderedElementChildren(parent, state)

  if (!isClosedDetails(parent)) {
    return children
  }

  return children.filter((child) => {
    const rendered = isSummaryElement(child)

    if (!rendered) {
      markSubtreeDisplayNone(child, state)
    }

    return rendered
  })
}

function orderedElementChildren(parent: Element, state: TaffyLayoutState): Element[] {
  const children = elementChildren(parent)
  const parentStyle = resolveSupportedStyle(parent, state)

  if (parentStyle.display !== 'flex' && parentStyle.display !== 'grid') {
    return children
  }

  // CSS order participates in flex/grid layout order before Taffy sees children.
  return children.toSorted((a, b) => resolveSupportedStyle(a, state).order - resolveSupportedStyle(b, state).order)
}

function isHidden(element: Element): boolean {
  return element.hasAttribute('hidden') && !isHiddenUntilFound(element)
}

function isHiddenUntilFound(element: Element): boolean {
  return element.getAttribute('hidden')?.toLowerCase() === 'until-found'
}

function isClosedDetails(element: Element): boolean {
  return element.tagName.toLowerCase() === 'details' && !element.hasAttribute('open')
}

function isSummaryElement(element: Element): boolean {
  return element.tagName.toLowerCase() === 'summary'
}

function isNonRenderedHtmlElement(element: Element): boolean {
  return nonRenderedHtmlElements.has(element.tagName.toLowerCase())
}

function horizontal(edges: Edges): number {
  return edges.left + edges.right
}

function vertical(edges: Edges): number {
  return edges.top + edges.bottom
}

function readNumberAttribute(element: Element, name: string): number | undefined {
  const value = element.getAttribute(name)

  if (!value) {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
