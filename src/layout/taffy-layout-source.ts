import {
  AlignContent,
  AlignItems,
  AlignSelf,
  BoxSizing,
  Display,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  Position,
  Style,
  TaffyTree,
  loadTaffy,
  type MeasureFunction,
  type Size,
  type TrackSizingFunction,
} from 'taffy-layout'
import { applyInlineStyle } from '../css/inline-style-source.ts'
import { createDefaultStyle, type Edges, type SupportedStyle } from '../css/supported-declaration.ts'
import { applyStyleRules, readStyleRules } from '../css/stylesheet-source.ts'
import type { UnsupportedCssPolicy } from '../css/unsupported-css-policy.ts'
import type { Viewport } from '../engine/layout-engine-config.ts'
import type { Box } from '../geometry/box.ts'
import type { HitBox } from '../hit-testing/hit-box.ts'
import type { TextMeasurer } from '../text/text-measurer.ts'
import type { LayoutSnapshot } from './layout-source.ts'

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

type MeasureContext = {
  text?: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  whiteSpace: SupportedStyle['whiteSpace']
  textMeasurer: TextMeasurer
  replacedSize?: Size<number>
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
  const context = createMeasureContext(element, style, state)
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

function toTaffyStyle(style: SupportedStyle, context: MeasureContext | undefined): Style {
  const taffyStyle = new Style()
  taffyStyle.display = toTaffyDisplay(style.display)
  taffyStyle.position =
    style.position === 'absolute' || style.position === 'fixed' ? Position.Absolute : Position.Relative
  taffyStyle.boxSizing = style.boxSizing === 'border-box' ? BoxSizing.BorderBox : BoxSizing.ContentBox
  taffyStyle.flexDirection = style.flexDirection === 'column' ? FlexDirection.Column : FlexDirection.Row
  taffyStyle.flexWrap = toTaffyFlexWrap(style.flexWrap)
  taffyStyle.alignItems = toTaffyAlignItems(style.alignItems)
  taffyStyle.alignSelf = toTaffyAlignSelf(style.alignSelf)
  taffyStyle.alignContent = toTaffyAlignContent(style.alignContent)
  taffyStyle.justifyContent = toTaffyJustifyContent(style.justifyContent)
  taffyStyle.justifyItems = toTaffyAlignItems(style.justifyItems)
  taffyStyle.justifySelf = toTaffyAlignSelf(style.justifySelf ?? 'auto')
  taffyStyle.flexGrow = style.flexGrow
  taffyStyle.flexShrink = style.flexShrink
  taffyStyle.flexBasis = style.flexBasis ?? 'auto'
  taffyStyle.aspectRatio = style.aspectRatio
  taffyStyle.gridTemplateColumns = toTaffyGridTracks(style.gridTemplateColumns)
  taffyStyle.gridTemplateRows = toTaffyGridTracks(style.gridTemplateRows)
  taffyStyle.gridAutoColumns = toTaffyGridTracks(style.gridAutoColumns)
  taffyStyle.gridAutoRows = toTaffyGridTracks(style.gridAutoRows)
  taffyStyle.gridColumn = {
    start: style.gridColumnStart,
    end: style.gridColumnEnd,
  }
  taffyStyle.gridRow = {
    start: style.gridRowStart,
    end: style.gridRowEnd,
  }
  taffyStyle.size = {
    width: style.width ?? context?.replacedSize?.width ?? 'auto',
    height: style.height ?? context?.replacedSize?.height ?? 'auto',
  }
  taffyStyle.minSize = {
    width: style.minWidth ?? 'auto',
    height: style.minHeight ?? 'auto',
  }
  taffyStyle.maxSize = {
    width: style.maxWidth ?? 'auto',
    height: style.maxHeight ?? 'auto',
  }
  taffyStyle.margin = toTaffyRect(style.margin)
  taffyStyle.padding = toTaffyRect(style.padding)
  taffyStyle.border = toTaffyRect(effectiveBorderWidth(style))
  taffyStyle.gap = {
    width: style.columnGap,
    height: style.rowGap,
  }
  taffyStyle.inset = {
    left: style.left ?? 'auto',
    right: style.right ?? 'auto',
    top: style.top ?? 'auto',
    bottom: style.bottom ?? 'auto',
  }

  return taffyStyle
}

function toTaffyDisplay(value: SupportedStyle['display']): Display {
  switch (value) {
    case 'flex':
      return Display.Flex
    case 'grid':
      return Display.Grid
    case 'none':
      return Display.None
    default:
      return Display.Block
  }
}

function toTaffyGridTracks(tracks: SupportedStyle['gridTemplateColumns']): TrackSizingFunction[] {
  return tracks.map((track) => {
    const taffyTrack = toTaffyGridTrack(track)
    return { min: taffyTrack, max: taffyTrack }
  })
}

function toTaffyGridTrack(track: SupportedStyle['gridTemplateColumns'][number]): number | `${number}%` {
  if (typeof track !== 'string') {
    return track
  }

  const percentage = Number(track.slice(0, -1))
  return `${percentage / 100}%`
}

function toTaffyFlexWrap(value: SupportedStyle['flexWrap']): FlexWrap {
  switch (value) {
    case 'wrap':
      return FlexWrap.Wrap
    case 'wrap-reverse':
      return FlexWrap.WrapReverse
    default:
      return FlexWrap.NoWrap
  }
}

function toTaffyAlignItems(value: SupportedStyle['alignItems']): AlignItems | undefined {
  switch (value) {
    case 'start':
      return AlignItems.Start
    case 'end':
      return AlignItems.End
    case 'flex-start':
      return AlignItems.FlexStart
    case 'flex-end':
      return AlignItems.FlexEnd
    case 'center':
      return AlignItems.Center
    case 'stretch':
      return AlignItems.Stretch
    default:
      return undefined
  }
}

function toTaffyAlignSelf(value: SupportedStyle['alignSelf']): AlignSelf {
  switch (value) {
    case 'start':
      return AlignSelf.Start
    case 'end':
      return AlignSelf.End
    case 'flex-start':
      return AlignSelf.FlexStart
    case 'flex-end':
      return AlignSelf.FlexEnd
    case 'center':
      return AlignSelf.Center
    case 'stretch':
      return AlignSelf.Stretch
    default:
      return AlignSelf.Auto
  }
}

function toTaffyAlignContent(value: SupportedStyle['alignContent']): AlignContent | undefined {
  switch (value) {
    case 'start':
      return AlignContent.Start
    case 'end':
      return AlignContent.End
    case 'flex-start':
      return AlignContent.FlexStart
    case 'flex-end':
      return AlignContent.FlexEnd
    case 'center':
      return AlignContent.Center
    case 'stretch':
      return AlignContent.Stretch
    case 'space-between':
      return AlignContent.SpaceBetween
    case 'space-around':
      return AlignContent.SpaceAround
    case 'space-evenly':
      return AlignContent.SpaceEvenly
    default:
      return undefined
  }
}

function toTaffyJustifyContent(value: SupportedStyle['justifyContent']): JustifyContent | undefined {
  switch (value) {
    case 'start':
      return JustifyContent.Start
    case 'end':
      return JustifyContent.End
    case 'flex-start':
      return JustifyContent.FlexStart
    case 'flex-end':
      return JustifyContent.FlexEnd
    case 'center':
      return JustifyContent.Center
    case 'space-between':
      return JustifyContent.SpaceBetween
    case 'space-around':
      return JustifyContent.SpaceAround
    case 'space-evenly':
      return JustifyContent.SpaceEvenly
    default:
      return undefined
  }
}

function createMeasureContext(
  element: Element,
  style: SupportedStyle,
  state: TaffyLayoutState,
): MeasureContext | undefined {
  const replacedSize = replacedElementSize(element)

  if (replacedSize) {
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      whiteSpace: style.whiteSpace,
      textMeasurer: state.textMeasurer,
      replacedSize,
    }
  }

  const text = element.textContent ?? ''

  if (!text.trim()) {
    return undefined
  }

  return {
    text,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    whiteSpace: style.whiteSpace,
    textMeasurer: state.textMeasurer,
  }
}

const measureTaffyNode: MeasureFunction = (knownDimensions, availableSpace, _node, context): Size<number> => {
  const measureContext = context as MeasureContext | undefined

  if (!measureContext) {
    return {
      width: knownDimensions.width ?? 0,
      height: knownDimensions.height ?? 0,
    }
  }

  if (measureContext.replacedSize) {
    return {
      width: knownDimensions.width ?? measureContext.replacedSize.width,
      height: knownDimensions.height ?? measureContext.replacedSize.height,
    }
  }

  const maxWidth =
    typeof availableSpace.width === 'number'
      ? availableSpace.width
      : typeof knownDimensions.width === 'number'
        ? knownDimensions.width
        : Number.MAX_SAFE_INTEGER
  const measured = measureContext.textMeasurer.measure({
    text: measureContext.text ?? '',
    fontFamily: measureContext.fontFamily,
    fontSize: measureContext.fontSize,
    lineHeight: measureContext.lineHeight,
    maxWidth,
    whiteSpace: measureContext.whiteSpace,
  })

  return {
    width: knownDimensions.width ?? measured.width,
    height: knownDimensions.height ?? measured.height,
  }
}

function toTaffyRect(edges: Edges): { left: number; right: number; top: number; bottom: number } {
  return {
    left: edges.left,
    right: edges.right,
    top: edges.top,
    bottom: edges.bottom,
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

function effectiveBorderWidth(style: SupportedStyle): Edges {
  return {
    top: style.borderStyle.top === 'none' ? 0 : style.borderWidth.top,
    right: style.borderStyle.right === 'none' ? 0 : style.borderWidth.right,
    bottom: style.borderStyle.bottom === 'none' ? 0 : style.borderWidth.bottom,
    left: style.borderStyle.left === 'none' ? 0 : style.borderWidth.left,
  }
}

function horizontal(edges: Edges): number {
  return edges.left + edges.right
}

function vertical(edges: Edges): number {
  return edges.top + edges.bottom
}

function replacedElementSize(element: Element): Size<number> | undefined {
  const dataWidth = readNumberAttribute(element, 'data-layout-width')
  const dataHeight = readNumberAttribute(element, 'data-layout-height')

  if (dataWidth !== undefined && dataHeight !== undefined) {
    return { width: dataWidth, height: dataHeight }
  }

  const tagName = element.tagName.toLowerCase()

  if (!['img', 'svg', 'canvas', 'video'].includes(tagName)) {
    return undefined
  }

  const width = readNumberAttribute(element, 'width')
  const height = readNumberAttribute(element, 'height')

  if (width === undefined || height === undefined) {
    return undefined
  }

  return { width, height }
}

function readNumberAttribute(element: Element, name: string): number | undefined {
  const value = element.getAttribute(name)

  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}
