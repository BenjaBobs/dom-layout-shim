import { handleUnsupportedCss, type UnsupportedCssPolicy, type UnsupportedCssSource } from './unsupported-css-policy.ts'
import type { WhiteSpace } from '../text/text-measurer.ts'

export type Edges = {
  top: number
  right: number
  bottom: number
  left: number
}

export type BorderStyles = {
  top: 'none' | 'solid'
  right: 'none' | 'solid'
  bottom: 'none' | 'solid'
  left: 'none' | 'solid'
}

export type AlignItemsValue = 'flex-start' | 'flex-end' | 'center' | 'stretch'
export type JustifyContentValue =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'

export type SupportedStyle = {
  display: 'block' | 'flex' | 'none'
  position: 'static' | 'relative' | 'absolute' | 'fixed'
  boxSizing: 'content-box' | 'border-box'
  flexDirection: 'row' | 'column'
  alignItems?: AlignItemsValue
  justifyContent?: JustifyContentValue
  flexGrow: number
  flexShrink: number
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  top?: number
  right?: number
  bottom?: number
  left?: number
  zIndex: number
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden'
  margin: Edges
  padding: Edges
  rowGap: number
  columnGap: number
  borderWidth: Edges
  borderStyle: BorderStyles
  fontFamily: string
  fontSize: number
  lineHeight: number
  whiteSpace: WhiteSpace
}

export type DeclarationContext = {
  policy?: UnsupportedCssPolicy
  source: UnsupportedCssSource
  selector?: string
  element?: Element
}

export function createDefaultStyle(): SupportedStyle {
  return {
    display: 'block',
    position: 'static',
    boxSizing: 'content-box',
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 1,
    zIndex: 0,
    pointerEvents: 'auto',
    visibility: 'visible',
    margin: zeroEdges(),
    padding: zeroEdges(),
    rowGap: 0,
    columnGap: 0,
    borderWidth: zeroEdges(),
    borderStyle: {
      top: 'none',
      right: 'none',
      bottom: 'none',
      left: 'none',
    },
    fontFamily: 'sans-serif',
    fontSize: 16,
    lineHeight: 19.2,
    whiteSpace: 'normal',
  }
}

export function applyDeclaration(
  style: SupportedStyle,
  property: string,
  value: string,
  context: DeclarationContext,
): void {
  const normalizedProperty = property.trim().toLowerCase()
  const normalizedValue = value.trim().toLowerCase()

  switch (normalizedProperty) {
    case 'display':
      applyKeyword(style, 'display', normalizedValue, ['block', 'flex', 'none'], normalizedProperty, value, context)
      return
    case 'position':
      applyKeyword(
        style,
        'position',
        normalizedValue,
        ['static', 'relative', 'absolute', 'fixed'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'box-sizing':
      applyKeyword(
        style,
        'boxSizing',
        normalizedValue,
        ['content-box', 'border-box'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'flex-direction':
      applyKeyword(
        style,
        'flexDirection',
        normalizedValue,
        ['row', 'column'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'align-items':
      applyKeyword(
        style,
        'alignItems',
        normalizedValue,
        ['flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'justify-content':
      applyKeyword(
        style,
        'justifyContent',
        normalizedValue,
        ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'flex-grow':
      applyNumber(style, 'flexGrow', normalizedValue, normalizedProperty, value, context)
      return
    case 'flex-shrink':
      applyNumber(style, 'flexShrink', normalizedValue, normalizedProperty, value, context)
      return
    case 'pointer-events':
      applyKeyword(
        style,
        'pointerEvents',
        normalizedValue,
        ['auto', 'none'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'visibility':
      applyKeyword(
        style,
        'visibility',
        normalizedValue,
        ['visible', 'hidden'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
    case 'width':
    case 'height':
      applyLength(style, normalizedProperty, normalizedValue, normalizedProperty, value, context)
      return
    case 'min-width':
      applyLength(style, 'minWidth', normalizedValue, normalizedProperty, value, context)
      return
    case 'min-height':
      applyLength(style, 'minHeight', normalizedValue, normalizedProperty, value, context)
      return
    case 'max-width':
      applyLength(style, 'maxWidth', normalizedValue, normalizedProperty, value, context)
      return
    case 'max-height':
      applyLength(style, 'maxHeight', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset':
      applyInset(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'z-index':
      applyZIndex(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'padding':
      applyEdges(style.padding, normalizedValue, normalizedProperty, value, context)
      return
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
      applyEdge(style.padding, edgeNameFromProperty(normalizedProperty), normalizedValue, normalizedProperty, value, context)
      return
    case 'margin':
      applyEdges(style.margin, normalizedValue, normalizedProperty, value, context)
      return
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
      applyEdge(style.margin, edgeNameFromProperty(normalizedProperty), normalizedValue, normalizedProperty, value, context)
      return
    case 'gap':
      applyGap(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'row-gap':
      applyGapLength(style, 'rowGap', normalizedValue, normalizedProperty, value, context)
      return
    case 'column-gap':
      applyGapLength(style, 'columnGap', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-width':
      applyEdges(style.borderWidth, normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top-width':
    case 'border-right-width':
    case 'border-bottom-width':
    case 'border-left-width':
      applyEdge(
        style.borderWidth,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      )
      return
    case 'border-style':
      applyBorderStyles(style.borderStyle, normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top-style':
    case 'border-right-style':
    case 'border-bottom-style':
    case 'border-left-style':
      applyBorderStyle(
        style.borderStyle,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      )
      return
    case 'font-family':
      style.fontFamily = value.trim()
      return
    case 'font-size':
      applyFontSize(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'line-height':
      applyLineHeight(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'white-space':
      applyKeyword(
        style,
        'whiteSpace',
        normalizedValue,
        ['normal', 'pre-wrap', 'nowrap'],
        normalizedProperty,
        value,
        context,
      )
      return
    default:
      handleUnsupportedCss(context.policy, {
        property: normalizedProperty,
        value,
        reason: 'unknown-property',
        source: context.source,
        selector: context.selector,
        element: context.element,
      })
  }
}

function applyFontSize(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parsePxLength(value)

  if (length === undefined || length < 0) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const ratio = style.lineHeight / style.fontSize
  style.fontSize = length
  style.lineHeight = ratio * length
}

function applyLineHeight(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const pxLength = parsePxLength(value)

  if (pxLength !== undefined && pxLength >= 0) {
    style.lineHeight = pxLength
    return
  }

  const multiplier = Number(value)

  if (Number.isFinite(multiplier) && multiplier >= 0) {
    style.lineHeight = multiplier * style.fontSize
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyEdges(
  edges: Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const lengths = parseEdgeLengths(value, property, originalValue, context)

  if (!lengths) {
    return
  }

  edges.top = lengths.top
  edges.right = lengths.right
  edges.bottom = lengths.bottom
  edges.left = lengths.left
}

function applyEdge(
  edges: Edges,
  edge: keyof Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parsePxLength(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  edges[edge] = length
}

function applyKeyword<Key extends keyof SupportedStyle>(
  style: SupportedStyle,
  key: Key,
  value: string,
  supported: readonly SupportedStyle[Key][],
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (supported.includes(value as SupportedStyle[Key])) {
    style[key] = value as SupportedStyle[Key]
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyLength(
  style: SupportedStyle,
  key:
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'width'
    | 'height'
    | 'minWidth'
    | 'minHeight'
    | 'maxWidth'
    | 'maxHeight',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parsePxLength(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = length
}

function applyNumber(
  style: SupportedStyle,
  key: 'flexGrow' | 'flexShrink',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const number = Number(value)

  if (!Number.isFinite(number) || number < 0) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = number
}

function applyInset(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const lengths = parts.map(parsePxLength)

  if (lengths.some((length) => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [top, right = top, bottom = top, left = right] = lengths as number[]

  style.top = top
  style.right = right
  style.bottom = bottom
  style.left = left
}

function applyGap(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const lengths = parts.map(parseNonNegativePxLength)

  if (lengths.some((length) => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [rowGap, columnGap = rowGap] = lengths as number[]
  style.rowGap = rowGap
  style.columnGap = columnGap
}

function applyGapLength(
  style: SupportedStyle,
  key: 'rowGap' | 'columnGap',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parseNonNegativePxLength(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = length
}

function applyBorderStyles(
  styles: BorderStyles,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [top, right = top, bottom = top, left = right] = parts
  applyBorderStyle(styles, 'top', top, property, originalValue, context)
  applyBorderStyle(styles, 'right', right, property, originalValue, context)
  applyBorderStyle(styles, 'bottom', bottom, property, originalValue, context)
  applyBorderStyle(styles, 'left', left, property, originalValue, context)
}

function applyBorderStyle(
  styles: BorderStyles,
  edge: keyof BorderStyles,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || value === 'solid') {
    styles[edge] = value
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyZIndex(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.zIndex = 0
    return
  }

  const zIndex = Number(value)

  if (!Number.isInteger(zIndex)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style.zIndex = zIndex
}

function parsePxLength(value: string): number | undefined {
  if (value === '0') {
    return 0
  }

  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value)
  return match ? Number(match[1]) : undefined
}

function parseNonNegativePxLength(value: string): number | undefined {
  const length = parsePxLength(value)
  return length !== undefined && length >= 0 ? length : undefined
}

function parseEdgeLengths(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): Edges | undefined {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return undefined
  }

  const lengths = parts.map(parsePxLength)

  if (lengths.some((length) => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return undefined
  }

  const [top, right = top, bottom = top, left = right] = lengths as number[]
  return { top, right, bottom, left }
}

function edgeNameFromProperty(property: string): keyof Edges {
  if (property.includes('-right-') || property.endsWith('-right')) {
    return 'right'
  }

  if (property.includes('-bottom-') || property.endsWith('-bottom')) {
    return 'bottom'
  }

  if (property.includes('-left-') || property.endsWith('-left')) {
    return 'left'
  }

  return 'top'
}

function zeroEdges(): Edges {
  return { top: 0, right: 0, bottom: 0, left: 0 }
}
