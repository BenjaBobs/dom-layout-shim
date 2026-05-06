import { applyInlineStyle } from '../css/inline-style-source.ts'
import { createDefaultStyle, type Edges, type SupportedStyle } from '../css/supported-declaration.ts'
import { applyStyleRules, readStyleRules } from '../css/stylesheet-source.ts'
import type { UnsupportedCssPolicy } from '../css/unsupported-css-policy.ts'
import type { Viewport } from '../engine/layout-engine-config.ts'
import type { Box } from '../geometry/box.ts'
import type { HitBox } from '../hit-testing/hit-box.ts'
import type { TextMeasurer, TextMeasureResult } from '../text/text-measurer.ts'
import type { LayoutSnapshot } from './layout-source.ts'

type LayoutState = {
  boxes: HitBox[]
  rects: Map<Element, Box>
  clientRects: Map<Element, Box>
  styles: WeakMap<Element, SupportedStyle>
  rules: ReturnType<typeof readStyleRules>
  policy: UnsupportedCssPolicy | undefined
  viewport: Viewport
  textMeasurer: TextMeasurer
  domOrder: number
}

type ContainingBlock = {
  x: number
  y: number
  width: number
  height: number
}

export function computeDocumentLayout(
  document: Document,
  viewport: Viewport,
  policy: UnsupportedCssPolicy | undefined,
  textMeasurer: TextMeasurer,
  stylesheets: readonly string[],
): LayoutSnapshot {
  const state: LayoutState = {
    boxes: [],
    rects: new Map<Element, Box>(),
    clientRects: new Map<Element, Box>(),
    styles: new WeakMap<Element, SupportedStyle>(),
    rules: readStyleRules(document, policy, stylesheets),
    policy,
    viewport,
    textMeasurer,
    domOrder: 0,
  }

  const viewportContainingBlock = { x: 0, y: 0, width: viewport.width, height: viewport.height }
  layoutChildren(document.body, viewportContainingBlock, viewportContainingBlock, state)

  return { boxes: state.boxes, rects: state.rects, clientRects: state.clientRects }
}

function layoutChildren(
  parent: Element | null,
  flowContainingBlock: ContainingBlock,
  absoluteContainingBlock: ContainingBlock,
  state: LayoutState,
): number {
  if (!parent) {
    return 0
  }

  let cursorY = flowContainingBlock.y

  for (const element of elementChildren(parent)) {
    const style = resolveSupportedStyle(element, state)

    if (isHidden(element) || style.display === 'none') {
      markSubtreeDisplayNone(element, state)
      continue
    }

    if (style.position === 'absolute' || style.position === 'fixed') {
      const domOrder = state.domOrder
      state.domOrder += 1
      const containingBlock =
        style.position === 'fixed' ? viewportContainingBlock(state.viewport) : absoluteContainingBlock
      const box = computePositionedBox(element, style, containingBlock, state)
      recordBox(element, style, box, domOrder, state)
      const childFlowContainingBlock = contentContainingBlock(box, style)
      const childAbsoluteContainingBlock = paddingContainingBlock(box, style)
      layoutChildren(element, childFlowContainingBlock, childAbsoluteContainingBlock, state)
      continue
    }

    const result = layoutStaticElement(
      element,
      style,
      flowContainingBlock,
      cursorY,
      absoluteContainingBlock,
      state,
    )
    cursorY = result.nextY
  }

  return cursorY - flowContainingBlock.y
}

function layoutStaticElement(
  element: Element,
  style: SupportedStyle,
  containingBlock: ContainingBlock,
  cursorY: number,
  absoluteContainingBlock: ContainingBlock,
  state: LayoutState,
): { box: Box; nextY: number } {
  const domOrder = state.domOrder
  state.domOrder += 1

  const border = effectiveBorderWidth(style)
  const horizontalExtras = horizontal(style.padding) + horizontal(border)
  const verticalExtras = vertical(style.padding) + vertical(border)
  const availableWidth = Math.max(0, containingBlock.width - style.margin.left - style.margin.right)
  const sizingIntrinsicContent = measureIntrinsicContent(
    element,
    style,
    Math.max(0, availableWidth - horizontalExtras),
    state,
  )
  const width = applyWidthConstraints(
    style.width === undefined
      ? sizingIntrinsicContent?.width !== undefined && hasExplicitIntrinsicSize(element)
        ? sizingIntrinsicContent.width + horizontalExtras
        : availableWidth
      : computeBorderBoxSize(style.width, horizontalExtras, style.boxSizing),
    style,
    horizontalExtras,
  )
  const intrinsicContent = measureIntrinsicContent(element, style, Math.max(0, width - horizontalExtras), state)
  const flowX = containingBlock.x + style.margin.left
  const flowY = cursorY + style.margin.top
  const height =
    style.height === undefined
      ? undefined
      : applyHeightConstraints(
          computeBorderBoxSize(style.height, verticalExtras, style.boxSizing),
          style,
          verticalExtras,
        )
  const relativeOffset = computeRelativeOffset(style)
  const x = flowX + relativeOffset.x
  const y = flowY + relativeOffset.y
  const childFlowContainingBlock = {
    x: x + border.left + style.padding.left,
    y: y + border.top + style.padding.top,
    width: Math.max(0, width - horizontalExtras),
    height: Math.max(0, (height ?? 0) - verticalExtras),
  }
  const precomputedBox = { x, y, width, height: height ?? 0 }
  const childAbsoluteContainingBlock =
    style.position === 'relative' ? paddingContainingBlock(precomputedBox, style) : absoluteContainingBlock
  const childrenHeight = layoutChildren(element, childFlowContainingBlock, childAbsoluteContainingBlock, state)
  const resolvedHeight = applyHeightConstraints(
    height ?? verticalExtras + Math.max(childrenHeight, intrinsicContent?.height ?? 0),
    style,
    verticalExtras,
  )
  const box = { x, y, width, height: resolvedHeight }

  recordBox(element, style, box, domOrder, state)

  return {
    box,
    nextY: flowY + resolvedHeight + style.margin.bottom,
  }
}

function markSubtreeDisplayNone(element: Element, state: LayoutState): void {
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
  domOrder: number,
  state: LayoutState,
): void {
  state.rects.set(element, box)
  state.clientRects.set(element, computeClientBox(box, style))

  if (box.width <= 0 || box.height <= 0) {
    return
  }

  state.boxes.push({
    ...box,
    element,
    zIndex: style.zIndex,
    domOrder,
    pointerEvents: style.pointerEvents,
    visibility: style.visibility,
  })
}

function resolveSupportedStyle(element: Element, state: LayoutState): SupportedStyle {
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

function computePositionedBox(
  element: Element,
  style: SupportedStyle,
  containingBlock: ContainingBlock,
  state: LayoutState,
): Box {
  const border = effectiveBorderWidth(style)
  const horizontalExtras = horizontal(style.padding) + horizontal(border)
  const verticalExtras = vertical(style.padding) + vertical(border)
  const sizingIntrinsicContent = measureIntrinsicContent(element, style, containingBlock.width, state)
  const width = applyWidthConstraints(
    style.width === undefined
      ? computeAutoSize(
          style.left,
          style.right,
          containingBlock.width,
          sizingIntrinsicContent?.width,
          horizontalExtras,
        )
      : computeBorderBoxSize(style.width, horizontalExtras, style.boxSizing),
    style,
    horizontalExtras,
  )
  const intrinsicContent = measureIntrinsicContent(element, style, Math.max(0, width - horizontalExtras), state)
  const height = applyHeightConstraints(
    style.height === undefined
      ? computeAutoSize(style.top, style.bottom, containingBlock.height, intrinsicContent?.height, verticalExtras)
      : computeBorderBoxSize(style.height, verticalExtras, style.boxSizing),
    style,
    verticalExtras,
  )
  const x = containingBlock.x + computeStart(style.left, style.right, width, containingBlock.width)
  const y = containingBlock.y + computeStart(style.top, style.bottom, height, containingBlock.height)

  return {
    x,
    y,
    width,
    height,
  }
}

function contentContainingBlock(box: Box, style: SupportedStyle): ContainingBlock {
  const border = effectiveBorderWidth(style)
  const horizontalExtras = horizontal(style.padding) + horizontal(border)
  const verticalExtras = vertical(style.padding) + vertical(border)

  return {
    x: box.x + border.left + style.padding.left,
    y: box.y + border.top + style.padding.top,
    width: Math.max(0, box.width - horizontalExtras),
    height: Math.max(0, box.height - verticalExtras),
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

function paddingContainingBlock(box: Box, style: SupportedStyle): ContainingBlock {
  const border = effectiveBorderWidth(style)

  return {
    x: box.x + border.left,
    y: box.y + border.top,
    width: Math.max(0, box.width - horizontal(border)),
    height: Math.max(0, box.height - vertical(border)),
  }
}

function viewportContainingBlock(viewport: Viewport): ContainingBlock {
  return { x: 0, y: 0, width: viewport.width, height: viewport.height }
}

function computeRelativeOffset(style: SupportedStyle): { x: number; y: number } {
  const x = style.left !== undefined ? style.left : style.right !== undefined ? -style.right : 0
  const y = style.top !== undefined ? style.top : style.bottom !== undefined ? -style.bottom : 0

  return { x, y }
}

function computeBorderBoxSize(
  declaredSize: number,
  extras: number,
  boxSizing: SupportedStyle['boxSizing'],
): number {
  if (boxSizing === 'border-box') {
    return declaredSize
  }

  return declaredSize + extras
}

function applyWidthConstraints(size: number, style: SupportedStyle, extras: number): number {
  return applySizeConstraints(size, style.minWidth, style.maxWidth, style.boxSizing, extras)
}

function applyHeightConstraints(size: number, style: SupportedStyle, extras: number): number {
  return applySizeConstraints(size, style.minHeight, style.maxHeight, style.boxSizing, extras)
}

function applySizeConstraints(
  size: number,
  minSize: number | undefined,
  maxSize: number | undefined,
  boxSizing: SupportedStyle['boxSizing'],
  extras: number,
): number {
  let constrained = size

  if (maxSize !== undefined) {
    constrained = Math.min(constrained, computeBorderBoxSize(maxSize, extras, boxSizing))
  }

  if (minSize !== undefined) {
    constrained = Math.max(constrained, computeBorderBoxSize(minSize, extras, boxSizing))
  }

  return Math.max(0, constrained)
}

function effectiveBorderWidth(style: SupportedStyle): Edges {
  return {
    top: style.borderStyle.top === 'none' ? 0 : style.borderWidth.top,
    right: style.borderStyle.right === 'none' ? 0 : style.borderWidth.right,
    bottom: style.borderStyle.bottom === 'none' ? 0 : style.borderWidth.bottom,
    left: style.borderStyle.left === 'none' ? 0 : style.borderWidth.left,
  }
}

function computeAutoSize(
  start: number | undefined,
  end: number | undefined,
  total: number,
  intrinsicSize = 0,
  extras = 0,
): number {
  if (start !== undefined && end !== undefined) {
    return Math.max(0, total - start - end)
  }

  return intrinsicSize + extras
}

function computeStart(
  start: number | undefined,
  end: number | undefined,
  size: number,
  total: number,
): number {
  if (start !== undefined) {
    return start
  }

  if (end !== undefined) {
    return total - end - size
  }

  return 0
}

function horizontal(edges: Edges): number {
  return edges.left + edges.right
}

function vertical(edges: Edges): number {
  return edges.top + edges.bottom
}

function measureIntrinsicContent(
  element: Element,
  style: SupportedStyle,
  maxWidth: number | undefined,
  state: LayoutState,
): TextMeasureResult | undefined {
  const replacedSize = replacedElementSize(element)

  if (replacedSize) {
    return replacedSize
  }

  if (elementChildren(element).length > 0) {
    return undefined
  }

  const text = element.textContent ?? ''

  if (!text.trim()) {
    return undefined
  }

  return state.textMeasurer.measure({
    text,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    maxWidth,
    whiteSpace: style.whiteSpace,
  })
}

function replacedElementSize(element: Element): TextMeasureResult | undefined {
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

function isReplacedElement(element: Element): boolean {
  return ['img', 'svg', 'canvas', 'video'].includes(element.tagName.toLowerCase())
}

function hasExplicitIntrinsicSize(element: Element): boolean {
  const hasDataSize =
    readNumberAttribute(element, 'data-layout-width') !== undefined &&
    readNumberAttribute(element, 'data-layout-height') !== undefined

  return hasDataSize || isReplacedElement(element)
}
