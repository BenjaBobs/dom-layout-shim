import { wordSpacingWidth } from '../css-parity-implementation/layout/word-spacing.ts';

export type WhiteSpace = 'normal' | 'pre' | 'pre-line' | 'pre-wrap' | 'nowrap';

export type TextMeasureInput = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  maxWidth: number | undefined;
  lineHeight: number;
  whiteSpace: WhiteSpace;
};

export type TextMeasureResult = {
  width: number;
  height: number;
};

export type TextMeasurer = {
  measure(input: TextMeasureInput): TextMeasureResult;
};

export function createDefaultTextMeasurer(): TextMeasurer {
  return createDeterministicTextMeasurer();
}

export function createDeterministicTextMeasurer(): TextMeasurer {
  return {
    measure(input) {
      const lines = breakTextIntoLines(input);
      const width = lines.reduce(
        (max, line) =>
          Math.max(
            max,
            measuredLineWidth(
              line,
              input.fontFamily,
              input.fontSize,
              input.letterSpacing ?? 0,
              input.wordSpacing ?? 0,
            ),
          ),
        0,
      );

      return {
        width,
        height: lines.length * input.lineHeight,
      };
    },
  };
}

function breakTextIntoLines(input: TextMeasureInput): string[] {
  const normalizedText = normalizeText(input.text, input.whiteSpace);

  if (!normalizedText) {
    return [];
  }

  if (preservesHardBreaks(input.whiteSpace)) {
    return normalizedText.split('\n');
  }

  if (input.whiteSpace === 'nowrap' || !input.maxWidth || input.maxWidth <= 0) {
    return [normalizedText];
  }

  return wrapNormalText(
    normalizedText,
    input.maxWidth,
    input.fontFamily,
    input.fontSize,
    input.letterSpacing ?? 0,
    input.wordSpacing ?? 0,
  );
}

function measuredLineWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  letterSpacing: number,
  wordSpacing: number,
): number {
  // Approximate the wider capitals in the common proportional sans-serif stack
  // while preserving the long-standing fixed-width fallback for unknown fonts.
  const hasWiderCapitals = /(?:Roboto|Helvetica|Arial)/i.test(fontFamily);
  const glyphWidth = Array.from(text).reduce(
    (width, character) =>
      width +
      fontSize * (hasWiderCapitals && /[A-Z]/.test(character) ? 0.6 : 0.5),
    0,
  );
  return (
    glyphWidth +
    letterSpacingWidth(text, letterSpacing) +
    wordSpacingWidth(text, wordSpacing)
  );
}

function letterSpacingWidth(text: string, letterSpacing: number): number {
  // Chromium includes one letter-spacing advance after every rendered glyph,
  // including the final glyph in an inline text run.
  return text.length * letterSpacing;
}

function normalizeText(text: string, whiteSpace: WhiteSpace): string {
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') {
    return text.replace(/\r\n?/g, '\n');
  }

  if (whiteSpace === 'pre-line') {
    return text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(line => line.replace(/[ \t\f\v]+/g, ' ').trim())
      .join('\n');
  }

  return text.replace(/\s+/g, ' ').trim();
}

function preservesHardBreaks(whiteSpace: WhiteSpace): boolean {
  return (
    whiteSpace === 'pre' ||
    whiteSpace === 'pre-line' ||
    whiteSpace === 'pre-wrap'
  );
}

function wrapNormalText(
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  letterSpacing: number,
  wordSpacing: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (
      measuredLineWidth(
        next,
        fontFamily,
        fontSize,
        letterSpacing,
        wordSpacing,
      ) <= maxWidth
    ) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}
