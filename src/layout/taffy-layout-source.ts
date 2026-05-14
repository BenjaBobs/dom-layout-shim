import {
  Display,
  Style,
  TaffyTree,
  loadTaffy,
} from 'taffy-layout'
import { applyInlineStyle } from '../css/inline-style-source.ts'
import { createDefaultStyle, type Edges, type SupportedStyle } from '../css/supported-style.ts'
import { applyStyleRules, readStyleRules } from '../css/stylesheet-source.ts'
import type { UnsupportedCssPolicy } from '../css/unsupported-css-policy.ts'
import type { Viewport } from '../engine/layout-engine-config.ts'
import type { Box } from '../geometry/box.ts'
import type { HitBox } from '../hit-testing/hit-box.ts'
import type { TextMeasurer } from '../text/text-measurer.ts'
import type { LayoutSnapshot, ScrollOffset } from './layout-source.ts'
import { canMeasureTextLeaf, createMeasureContext, measureTaffyNode } from './taffy/taffy-measure.ts'
import { effectiveBorderWidth, toTaffyStyle } from './taffy/taffy-style.ts'

type TaffyLayoutState = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
  elementScrolls: Map<Element, ScrollOffset>
  elementNodes: Map<Element, bigint>
  contentsElements: Set<Element>
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

let taffyLoadPromise: Promise<unknown> | undefined

const nonRenderedHtmlElements = new Set(['base', 'link', 'meta', 'script', 'style', 'template', 'title'])

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
  recordChildLayouts(document.body, { x: 0, y: 0 }, infiniteClipBounds(), scroll, false, state)

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
        recordChildLayouts(element, origin, clipBounds, scroll, fixedContainingBlock, state)
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
    recordBox(element, style, box, hitClipBounds, domOrder, state)
    recordChildLayouts(
      element,
      {
        x: layoutBox.x - elementScroll.x,
        y: layoutBox.y - elementScroll.y,
      },
      childClipBounds(style, box, hitClipBounds),
      scroll,
      fixedSubtree,
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

function recordBox(
  element: Element,
  style: SupportedStyle,
  box: Box,
  clipBounds: ClipBounds,
  domOrder: number,
  state: TaffyLayoutState,
): void {
  state.rects.set(element, box)
  state.clientRects.set(element, computeClientBox(box, style))

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
  state.styles.set(element, style)
  return style
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

function applyInputUserAgentDefaults(style: SupportedStyle, element: Element): void {
  const type = (element.getAttribute('type') ?? 'text').toLowerCase()

  style.boxSizing = 'border-box'

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
  return element.hasAttribute('hidden')
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
