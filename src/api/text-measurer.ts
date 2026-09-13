import { cacheTextMeasurer } from '../css-parity-implementation/layout/cached-text-measurer.ts';
import { breakTextLines } from '../css-parity-implementation/layout/text-lines.ts';
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
  return cacheTextMeasurer({
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
  });
}

function breakTextIntoLines(input: TextMeasureInput): string[] {
  return breakTextLines(input.text, input.whiteSpace, input.maxWidth, text =>
    measuredLineWidth(
      text,
      input.fontFamily,
      input.fontSize,
      input.letterSpacing ?? 0,
      input.wordSpacing ?? 0,
    ),
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
