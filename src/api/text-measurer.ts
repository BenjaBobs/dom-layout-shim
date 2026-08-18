import {
  layout as layoutText,
  measureLineStats,
  measureNaturalWidth,
  prepareWithSegments,
} from '@chenglou/pretext'

export type WhiteSpace = 'normal' | 'pre' | 'pre-line' | 'pre-wrap' | 'nowrap'

export type TextMeasureInput = {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight?: number
  letterSpacing?: number
  maxWidth: number | undefined
  lineHeight: number
  whiteSpace: WhiteSpace
}

export type TextMeasureResult = {
  width: number
  height: number
}

export type TextMeasurer = {
  measure(input: TextMeasureInput): TextMeasureResult
}

export function createDefaultTextMeasurer(): TextMeasurer {
  return createPretextTextMeasurer({
    fallback: createDeterministicTextMeasurer(),
  })
}

export function createPretextTextMeasurer(options: { fallback?: TextMeasurer } = {}): TextMeasurer {
  let pretextAvailable = true
  const fallback = options.fallback

  return {
    measure(input) {
      if (!pretextAvailable) {
        return measureWithFallback(input, fallback)
      }

      try {
        return measureWithPretext(input)
      } catch {
        pretextAvailable = false
        return measureWithFallback(input, fallback)
      }
    },
  }
}

export function createDeterministicTextMeasurer(): TextMeasurer {
  return {
    measure(input) {
      const lines = breakTextIntoLines(input)
      const width = lines.reduce((max, line) => Math.max(
        max,
        measuredLineWidth(line, input.fontFamily, input.fontSize, input.letterSpacing ?? 0),
      ), 0)

      return {
        width,
        height: lines.length * input.lineHeight,
      }
    },
  }
}

function measureWithPretext(input: TextMeasureInput): TextMeasureResult {
  const maxWidth = input.whiteSpace === 'nowrap' || input.whiteSpace === 'pre'
    ? Number.MAX_SAFE_INTEGER
    : input.maxWidth ?? Number.MAX_SAFE_INTEGER
  const options = {
    whiteSpace: preservesHardBreaks(input.whiteSpace) ? 'pre-wrap' as const : 'normal' as const,
  }
  const text = input.whiteSpace === 'pre-line' ? normalizeText(input.text, input.whiteSpace) : input.text

  if (input.whiteSpace === 'nowrap') {
    const prepared = prepareWithSegments(text, fontShorthand(input), options)

    return {
      width: measureNaturalWidth(prepared) + letterSpacingWidth(text, input.letterSpacing ?? 0),
      height: input.lineHeight,
    }
  }

  const prepared = prepareWithSegments(text, fontShorthand(input), options)
  const laidOut = layoutText(prepared, maxWidth, input.lineHeight)
  const lineStats = measureLineStats(prepared, maxWidth)

  return {
    width: lineStats.maxLineWidth + letterSpacingWidth(text, input.letterSpacing ?? 0),
    height: laidOut.height,
  }
}

function measureWithFallback(input: TextMeasureInput, fallback: TextMeasurer | undefined): TextMeasureResult {
  if (!fallback) {
    throw new Error('Pretext text measurement is unavailable in this runtime')
  }

  return fallback.measure(input)
}

function fontShorthand(input: TextMeasureInput): string {
  return `${input.fontWeight ?? 400} ${input.fontSize}px ${input.fontFamily}`
}

function breakTextIntoLines(input: TextMeasureInput): string[] {
  const normalizedText = normalizeText(input.text, input.whiteSpace)

  if (!normalizedText) {
    return []
  }

  if (preservesHardBreaks(input.whiteSpace)) {
    return normalizedText.split('\n')
  }

  if (input.whiteSpace === 'nowrap' || !input.maxWidth || input.maxWidth <= 0) {
    return [normalizedText]
  }

  return wrapNormalText(normalizedText, input.maxWidth, input.fontFamily, input.fontSize, input.letterSpacing ?? 0)
}

function measuredLineWidth(text: string, fontFamily: string, fontSize: number, letterSpacing: number): number {
  // Approximate the wider capitals in the common proportional sans-serif stack
  // while preserving the long-standing fixed-width fallback for unknown fonts.
  const hasWiderCapitals = /(?:Roboto|Helvetica|Arial)/i.test(fontFamily)
  const glyphWidth = Array.from(text).reduce((width, character) =>
    width + fontSize * (hasWiderCapitals && /[A-Z]/.test(character) ? 0.6 : 0.5), 0)
  return glyphWidth + letterSpacingWidth(text, letterSpacing)
}

function letterSpacingWidth(text: string, letterSpacing: number): number {
  // Chromium includes one letter-spacing advance after every rendered glyph,
  // including the final glyph in an inline text run.
  return text.length * letterSpacing
}

function normalizeText(text: string, whiteSpace: WhiteSpace): string {
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') {
    return text.replace(/\r\n?/g, '\n')
  }

  if (whiteSpace === 'pre-line') {
    return text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
      .join('\n')
  }

  return text.replace(/\s+/g, ' ').trim()
}

function preservesHardBreaks(whiteSpace: WhiteSpace): boolean {
  return whiteSpace === 'pre' || whiteSpace === 'pre-line' || whiteSpace === 'pre-wrap'
}

function wrapNormalText(
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  letterSpacing: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word

    if (measuredLineWidth(next, fontFamily, fontSize, letterSpacing) <= maxWidth) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
    }

    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}
