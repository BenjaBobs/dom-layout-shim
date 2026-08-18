import type { MeasureFunction, Size } from 'taffy-layout'
import type { SupportedStyle } from '../../css/supported-style.ts'
import type { TextMeasurer } from '../../../api/text-measurer.ts'
import type { NativeControlMetrics } from '../../../api/native-control-profile.ts'

const elementNodeType = 1
const textNodeType = 3
const commentNodeType = 8

export type MeasureContext = {
  text?: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  whiteSpace: SupportedStyle['whiteSpace']
  textMeasurer: TextMeasurer
  replacedSize?: Size<number>
}

export function createMeasureContext(
  element: Element,
  style: SupportedStyle,
  textMeasurer: TextMeasurer,
  nativeControlMetrics: NativeControlMetrics,
  generatedContent: { before: string; after: string } = { before: '', after: '' },
): MeasureContext | undefined {
  const replacedSize = replacedElementSize(element) ?? formControlIntrinsicSize(
    element,
    style,
    textMeasurer,
    nativeControlMetrics,
  )

  if (replacedSize) {
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      whiteSpace: style.whiteSpace,
      textMeasurer,
      replacedSize,
    }
  }

  const text = `${generatedContent.before}${textContentForMeasurement(element)}${generatedContent.after}`

  if (
    !text.trim() &&
    style.whiteSpace !== 'pre' &&
    style.whiteSpace !== 'pre-line' &&
    style.whiteSpace !== 'pre-wrap'
  ) {
    return undefined
  }

  return {
    text,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    whiteSpace: style.whiteSpace,
    textMeasurer,
  }
}

export function canMeasureTextLeaf(element: Element): boolean {
  return Array.from(element.childNodes).every((node) => {
    if (node.nodeType === textNodeType || node.nodeType === commentNodeType) {
      return true
    }

    return node.nodeType === elementNodeType && (node as Element).tagName.toLowerCase() === 'br'
  })
}

export const measureTaffyNode: MeasureFunction = (knownDimensions, availableSpace, _node, context): Size<number> => {
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
    fontWeight: measureContext.fontWeight,
    letterSpacing: measureContext.letterSpacing,
    lineHeight: measureContext.lineHeight,
    maxWidth,
    whiteSpace: measureContext.whiteSpace,
  })

  return {
    width: knownDimensions.width ?? measured.width,
    height: knownDimensions.height ?? measured.height,
  }
}

function replacedElementSize(element: Element): Size<number> | undefined {
  const dataWidth = readNumberAttribute(element, 'data-layout-width')
  const dataHeight = readNumberAttribute(element, 'data-layout-height')

  if (dataWidth !== undefined && dataHeight !== undefined) {
    return { width: dataWidth, height: dataHeight }
  }

  const tagName = element.tagName.toLowerCase()

  if (tagName === 'audio') {
    return element.hasAttribute('controls') ? { width: 300, height: 54 } : undefined
  }

  if (tagName === 'object' && hasObjectFallbackContent(element)) {
    return undefined
  }

  if (tagName === 'iframe' || tagName === 'object') {
    return {
      width: readNumberAttribute(element, 'width') ?? 300,
      height: readNumberAttribute(element, 'height') ?? 150,
    }
  }

  if (tagName === 'svg' || tagName === 'canvas' || tagName === 'video') {
    return {
      width: readNumberAttribute(element, 'width') ?? 300,
      height: readNumberAttribute(element, 'height') ?? 150,
    }
  }

  if (tagName !== 'img') {
    return undefined
  }

  const width = readNumberAttribute(element, 'width')
  const height = readNumberAttribute(element, 'height')

  if (width === undefined && height === undefined) {
    return undefined
  }

  return { width: width ?? 0, height: height ?? 0 }
}

function formControlIntrinsicSize(
  element: Element,
  style: SupportedStyle,
  textMeasurer: TextMeasurer,
  metrics: NativeControlMetrics,
): Size<number> | undefined {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'textarea') {
    return {
      width: (readPositiveIntegerAttribute(element, 'cols') ?? 20) * metrics.textarea.columnWidth + metrics.textarea.paddingWidth,
      height: (readPositiveIntegerAttribute(element, 'rows') ?? 2) * metrics.textarea.rowHeight + metrics.textarea.paddingHeight,
    }
  }

  if (tagName === 'select') {
    return selectIntrinsicSize(element, style, textMeasurer, metrics)
  }

  if (tagName === 'progress') {
    return metrics.progress
  }

  if (tagName === 'meter') {
    return metrics.meter
  }

  if (tagName === 'button') {
    return buttonLikeIntrinsicSize(element.textContent ?? '', style, textMeasurer, metrics)
  }

  if (tagName !== 'input') {
    return undefined
  }

  const type = (element.getAttribute('type') ?? 'text').toLowerCase()

  if (type === 'image') {
    const width = readNumberAttribute(element, 'width')
    const height = readNumberAttribute(element, 'height')

    if (width !== undefined && height !== undefined) {
      return { width, height }
    }

    return metrics.imageFallback
  }

  if (type === 'file') {
    return metrics.file
  }

  switch (type) {
    case 'checkbox':
    case 'radio':
      return metrics.checkboxRadio
    case 'color':
      return metrics.color
    case 'time':
      return metrics.time
    case 'range':
      return metrics.range
    case 'button': {
      const value = element.getAttribute('value') ?? ''
      return value ? buttonLikeIntrinsicSize(value, style, textMeasurer, metrics) : {
        width: metrics.button.emptyWidth,
        height: metrics.button.height,
      }
    }
    case 'reset':
    case 'submit':
      return buttonLikeIntrinsicSize(
        element.getAttribute('value') ?? defaultInputButtonLabel(type),
        style,
        textMeasurer,
        metrics,
      )
    default:
      return { width: inputTextLikeIntrinsicWidth(element, type, metrics), height: metrics.textInput.height }
  }
}

function inputTextLikeIntrinsicWidth(element: Element, type: string, metrics: NativeControlMetrics): number {
  if (!textLikeInputSizeAttributeApplies(type)) {
    return metrics.textInput.width
  }

  const size = readPositiveIntegerAttribute(element, 'size')
  return size === undefined
    ? metrics.textInput.width
    : size * metrics.textInput.sizeCharacterWidth + metrics.textInput.sizePaddingWidth
}

function textLikeInputSizeAttributeApplies(type: string): boolean {
  return ['text', 'password', 'search', 'email', 'url', 'tel'].includes(type)
}

function selectIntrinsicSize(
  element: Element,
  style: SupportedStyle,
  textMeasurer: TextMeasurer,
  metrics: NativeControlMetrics,
): Size<number> {
  const size = readPositiveIntegerAttribute(element, 'size')
  const listRows = size && size > 1 ? size : element.hasAttribute('multiple') ? 4 : undefined
  const optionWidth = widestOptionTextWidth(element, style, textMeasurer)

  if (listRows) {
    return {
      width: optionWidth + metrics.select.listPaddingWidth,
      height: listRows * metrics.select.listRowHeight + metrics.select.listPaddingHeight,
    }
  }

  return {
    width: Math.max(metrics.select.minWidth, optionWidth + metrics.select.paddingWidth),
    height: metrics.select.height,
  }
}

function widestOptionTextWidth(element: Element, style: SupportedStyle, textMeasurer: TextMeasurer): number {
  const options = Array.from(element.querySelectorAll('option'))
  const texts = options.length > 0 ? options.map((option) => option.textContent?.trim() ?? '') : [element.textContent?.trim() ?? '']

  return texts.reduce((width, text) => {
    const measured = textMeasurer.measure({
      text,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      maxWidth: Number.MAX_SAFE_INTEGER,
      whiteSpace: 'nowrap',
    })

    return Math.max(width, measured.width)
  }, 0)
}

function buttonLikeIntrinsicSize(
  text: string,
  style: SupportedStyle,
  textMeasurer: TextMeasurer,
  metrics: NativeControlMetrics,
): Size<number> {
  const label = text.trim()

  if (!label) {
    return { width: metrics.button.emptyWidth, height: metrics.button.emptyHeight }
  }

  const measured = textMeasurer.measure({
    text: label,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    maxWidth: Number.MAX_SAFE_INTEGER,
    whiteSpace: 'nowrap',
  })

  return {
    width: measured.width + metrics.button.horizontalPadding,
    height: metrics.button.height,
  }
}

function defaultInputButtonLabel(type: string): string {
  switch (type) {
    case 'reset':
      return 'Reset'
    case 'submit':
      return 'Submit'
    default:
      return ''
  }
}

function textContentForMeasurement(element: Element): string {
  if (!canMeasureTextLeaf(element)) {
    return flattenedTextContent(element)
  }

  return Array.from(element.childNodes)
    .map((node) => {
      if (node.nodeType === elementNodeType && (node as Element).tagName.toLowerCase() === 'br') {
        return '\n'
      }

      return node.textContent ?? ''
    })
    .join('')
}

function flattenedTextContent(node: Node): string {
  if (node.nodeType === textNodeType || node.nodeType === commentNodeType) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== elementNodeType) {
    return node.textContent ?? ''
  }

  const element = node as Element

  if (element.tagName.toLowerCase() === 'br') {
    return '\n'
  }

  return Array.from(element.childNodes).map(flattenedTextContent).join('')
}

function readNumberAttribute(element: Element, name: string): number | undefined {
  const value = element.getAttribute(name)

  if (!value) {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function hasObjectFallbackContent(element: Element): boolean {
  return (
    !element.hasAttribute('type') &&
    !element.hasAttribute('data') &&
    Array.from(element.children).some((child) => child.tagName.toLowerCase() !== 'param')
  )
}

function readPositiveIntegerAttribute(element: Element, name: string): number | undefined {
  const number = readNumberAttribute(element, name)

  if (number === undefined || number < 1 || !Number.isInteger(number)) {
    return undefined
  }

  return number
}
