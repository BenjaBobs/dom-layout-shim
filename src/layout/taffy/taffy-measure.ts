import type { MeasureFunction, Size } from 'taffy-layout'
import type { SupportedStyle } from '../../css/supported-style.ts'
import type { TextMeasurer } from '../../text/text-measurer.ts'

const elementNodeType = 1
const textNodeType = 3
const commentNodeType = 8

export type MeasureContext = {
  text?: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  whiteSpace: SupportedStyle['whiteSpace']
  textMeasurer: TextMeasurer
  replacedSize?: Size<number>
}

export function createMeasureContext(
  element: Element,
  style: SupportedStyle,
  textMeasurer: TextMeasurer,
): MeasureContext | undefined {
  const replacedSize = replacedElementSize(element) ?? formControlIntrinsicSize(element, style, textMeasurer)

  if (replacedSize) {
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      whiteSpace: style.whiteSpace,
      textMeasurer,
      replacedSize,
    }
  }

  const text = textContentForMeasurement(element)

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

function formControlIntrinsicSize(
  element: Element,
  style: SupportedStyle,
  textMeasurer: TextMeasurer,
): Size<number> | undefined {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'textarea') {
    return { width: 181, height: 40 }
  }

  if (tagName === 'select') {
    const text = element.textContent?.trim() || ''
    const measured = textMeasurer.measure({
      text,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      maxWidth: Number.MAX_SAFE_INTEGER,
      whiteSpace: 'nowrap',
    })

    return {
      width: Math.max(46, measured.width + 22),
      height: 21,
    }
  }

  if (tagName === 'button') {
    return buttonLikeIntrinsicSize(element.textContent ?? '', style, textMeasurer)
  }

  if (tagName !== 'input') {
    return undefined
  }

  const type = (element.getAttribute('type') ?? 'text').toLowerCase()

  switch (type) {
    case 'checkbox':
    case 'radio':
      return { width: 13, height: 13 }
    case 'range':
      return { width: 129, height: 16 }
    case 'button':
    case 'reset':
    case 'submit':
      return buttonLikeIntrinsicSize(element.getAttribute('value') ?? defaultInputButtonLabel(type), style, textMeasurer)
    default:
      return { width: 192, height: 23 }
  }
}

function buttonLikeIntrinsicSize(text: string, style: SupportedStyle, textMeasurer: TextMeasurer): Size<number> {
  const label = text.trim()

  if (!label) {
    return { width: 16, height: 6 }
  }

  const measured = textMeasurer.measure({
    text: label,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    maxWidth: Number.MAX_SAFE_INTEGER,
    whiteSpace: 'nowrap',
  })

  return {
    width: measured.width + 16,
    height: 23,
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
    return element.textContent ?? ''
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

function readNumberAttribute(element: Element, name: string): number | undefined {
  const value = element.getAttribute(name)

  if (!value) {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
