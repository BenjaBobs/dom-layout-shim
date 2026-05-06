export type WhiteSpace = 'normal' | 'pre-wrap' | 'nowrap'

export type TextMeasureInput = {
  text: string
  fontFamily: string
  fontSize: number
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
  return {
    measure(input) {
      const lines = breakTextIntoLines(input)
      const charWidth = input.fontSize * 0.5
      const width = lines.reduce((max, line) => Math.max(max, line.length * charWidth), 0)

      return {
        width,
        height: lines.length * input.lineHeight,
      }
    },
  }
}

function breakTextIntoLines(input: TextMeasureInput): string[] {
  const normalizedText = normalizeText(input.text, input.whiteSpace)

  if (!normalizedText) {
    return []
  }

  if (input.whiteSpace === 'pre-wrap') {
    return normalizedText.split('\n')
  }

  if (input.whiteSpace === 'nowrap' || !input.maxWidth || input.maxWidth <= 0) {
    return [normalizedText]
  }

  return wrapNormalText(normalizedText, input.maxWidth, input.fontSize * 0.5)
}

function normalizeText(text: string, whiteSpace: WhiteSpace): string {
  if (whiteSpace === 'pre-wrap') {
    return text.replace(/\r\n?/g, '\n')
  }

  return text.replace(/\s+/g, ' ').trim()
}

function wrapNormalText(text: string, maxWidth: number, charWidth: number): string[] {
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / charWidth))
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word

    if (next.length <= maxCharsPerLine) {
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
