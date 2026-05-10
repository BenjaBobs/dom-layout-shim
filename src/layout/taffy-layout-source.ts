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
import type { LayoutSnapshot } from './layout-source.ts'
import { createMeasureContext, measureTaffyNode } from './taffy/taffy-measure.ts'
import { effectiveBorderWidth, toTaffyStyle } from './taffy/taffy-style.ts'

type TaffyLayoutState = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
  elementNodes: Map<Element, bigint>
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

export async function loadTaffyBackend(): Promise<void> {
  taffyLoadPromise ??= loadTaffy()
  await taffyLoadPromise
}

export function computeTaffyDocumentLayout(
  document: Document,
  viewport: Viewport,
  policy: UnsupportedCssPolicy | undefined,
  textMeasurer: TextMeasurer,
  stylesheets: readonly string[],
): LayoutSnapshot {
  const layoutTree = buildTaffyLayoutTree(document, viewport, policy, textMeasurer, stylesheets)
  computeTaffyLayout(layoutTree, viewport)
  return collectTaffyLayoutSnapshot(document, layoutTree.state)
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
    elementNodes: new Map<Element, bigint>(),
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

function collectTaffyLayoutSnapshot(document: Document, state: TaffyLayoutState): LayoutSnapshot {
  recordChildLayouts(document.body, { x: 0, y: 0 }, infiniteClipBounds(), state)

  return { boxes: state.boxes, rects: state.rects, clientRects: state.clientRects }
}

function buildChildNodes(parent: Element | null, state: TaffyLayoutState): bigint[] {
  if (!parent) {
    return []
  }

  return elementChildren(parent)
    .map((element) => buildNode(element, state))
    .filter((node): node is bigint => node !== undefined)
}

function buildNode(element: Element, state: TaffyLayoutState): bigint | undefined {
  const style = resolveSupportedStyle(element, state)

  if (isHidden(element) || style.display === 'none') {
    markSubtreeDisplayNone(element, state)
    return undefined
  }

  const children = buildChildNodes(element, state)
  const context = createMeasureContext(element, style, state.textMeasurer)
  const taffyStyle = toTaffyStyle(style, context)
  const node =
    children.length === 0 && context
      ? state.tree.newLeafWithContext(taffyStyle, context)
      : state.tree.newWithChildren(taffyStyle, children)

  state.elementNodes.set(element, node)
  return node
}

function recordChildLayouts(
  parent: Element | null,
  origin: { x: number; y: number },
  clipBounds: ClipBounds,
  state: TaffyLayoutState,
): void {
  if (!parent) {
    return
  }

  for (const element of elementChildren(parent)) {
    const node = state.elementNodes.get(element)

    if (!node) {
      continue
    }

    const style = resolveSupportedStyle(element, state)
    const layout = state.tree.getLayout(node)
    const box = {
      x: origin.x + layout.x,
      y: origin.y + layout.y,
      width: layout.width,
      height: layout.height,
    }
    const domOrder = state.domOrder
    state.domOrder += 1

    recordBox(element, style, box, clipBounds, domOrder, state)
    recordChildLayouts(element, { x: box.x, y: box.y }, childClipBounds(style, box, clipBounds), state)
  }
}

function markSubtreeDisplayNone(element: Element, state: TaffyLayoutState): void {
  state.rects.set(element, { x: 0, y: 0, width: 0, height: 0 })
  state.clientRects.set(element, { x: 0, y: 0, width: 0, height: 0 })

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
  applyStyleRules(style, element, state.rules, state.policy)
  applyInlineStyle(style, element, state.policy)
  state.styles.set(element, style)
  return style
}

function elementChildren(parent: Element): Element[] {
  return Array.from(parent.children).filter((element) => {
    const tagName = element.tagName.toLowerCase()
    return tagName !== 'script' && tagName !== 'style'
  })
}

function isHidden(element: Element): boolean {
  return element.hasAttribute('hidden')
}

function horizontal(edges: Edges): number {
  return edges.left + edges.right
}

function vertical(edges: Edges): number {
  return edges.top + edges.bottom
}
