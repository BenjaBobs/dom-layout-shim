import type { MeasureFunction, Size } from 'taffy-layout'
import type { SupportedStyle } from '../../css/supported-style.ts'
import type { TextMeasurer } from '../../text/text-measurer.ts'

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
  const replacedSize = replacedElementSize(element)

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
    textMeasurer,
  }
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

function readNumberAttribute(element: Element, name: string): number | undefined {
  const value = element.getAttribute(name)

  if (!value) {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
