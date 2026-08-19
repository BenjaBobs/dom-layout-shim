// opentype.js does not publish TypeScript declarations. Keep the untyped
// boundary here and expose only the metric operation the layout engine uses.
// @ts-expect-error -- package has no declaration file
import opentype from 'opentype.js';
import type {
  TextMeasureInput,
  TextMeasureResult,
  TextMeasurer,
} from '../../api/text-measurer.ts';
import { readFontFaceRules } from '../css/stylesheet-source.ts';

type LoadedFontFace = {
  family: string;
  weight: number;
  font: ParsedFont;
};

type ParsedFont = {
  getAdvanceWidth(
    text: string,
    fontSize: number,
    options: { kerning: boolean },
  ): number;
};

export async function createDocumentFontTextMeasurer(
  document: Document,
  configuredStylesheets: readonly string[],
  fallback: TextMeasurer,
): Promise<TextMeasurer> {
  const faces: LoadedFontFace[] = [];
  const fetchFont =
    document.defaultView?.fetch?.bind(document.defaultView) ?? fetch;

  for (const rule of readFontFaceRules(document, configuredStylesheets)) {
    for (const source of rule.sources) {
      if (source.type === 'local' || source.format === 'woff2') continue;
      try {
        const response = await fetchFont(source.url);
        if (!response.ok) continue;
        const font = opentype.parse(await response.arrayBuffer());
        faces.push({
          family: normalizeFamily(rule.family),
          weight: rule.weight,
          font,
        });
        break;
      } catch {
        // Try the next declared source. Unavailable fonts retain the configured
        // deterministic fallback rather than making attachment fail.
      }
    }
  }

  if (faces.length === 0) return fallback;
  return createFontTextMeasurer(faces, fallback);
}

function createFontTextMeasurer(
  faces: readonly LoadedFontFace[],
  fallback: TextMeasurer,
): TextMeasurer {
  return {
    measure(input) {
      const face = selectFace(faces, input.fontFamily, input.fontWeight ?? 400);
      if (!face) return fallback.measure(input);
      return measureWithFont(face.font, input);
    },
  };
}

function selectFace(
  faces: readonly LoadedFontFace[],
  familyList: string,
  weight: number,
): LoadedFontFace | undefined {
  for (const family of splitFamilyList(familyList)) {
    const candidates = faces.filter(
      face => face.family === normalizeFamily(family),
    );
    if (candidates.length > 0) {
      return candidates.toSorted(
        (a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight),
      )[0];
    }
  }
  return undefined;
}

function splitFamilyList(value: string): string[] {
  return value
    .split(',')
    .map(family => family.trim().replace(/^(['"])(.*)\1$/, '$2'));
}

function normalizeFamily(value: string): string {
  return value
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .toLowerCase();
}

function measureWithFont(
  font: ParsedFont,
  input: TextMeasureInput,
): TextMeasureResult {
  const lines = breakLines(input, text => measuredWidth(font, text, input));
  return {
    width: lines.reduce(
      (maximum, line) => Math.max(maximum, measuredWidth(font, line, input)),
      0,
    ),
    height: lines.length * input.lineHeight,
  };
}

function measuredWidth(
  font: ParsedFont,
  text: string,
  input: TextMeasureInput,
): number {
  return (
    font.getAdvanceWidth(text, input.fontSize, { kerning: true }) +
    text.length * (input.letterSpacing ?? 0)
  );
}

function breakLines(
  input: TextMeasureInput,
  widthOf: (text: string) => number,
): string[] {
  const text = normalizeWhitespace(input.text, input.whiteSpace);
  if (!text) return [];
  if (
    input.whiteSpace === 'pre' ||
    input.whiteSpace === 'pre-wrap' ||
    input.whiteSpace === 'pre-line'
  ) {
    return text
      .split('\n')
      .flatMap(line =>
        input.whiteSpace === 'pre-wrap'
          ? wrapLine(line, input.maxWidth, widthOf)
          : [line],
      );
  }
  if (input.whiteSpace === 'nowrap' || !input.maxWidth || input.maxWidth <= 0)
    return [text];
  return wrapLine(text, input.maxWidth, widthOf);
}

function wrapLine(
  text: string,
  maxWidth: number | undefined,
  widthOf: (text: string) => number,
): string[] {
  if (!maxWidth || maxWidth <= 0) return [text];
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || widthOf(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function normalizeWhitespace(
  text: string,
  whiteSpace: TextMeasureInput['whiteSpace'],
): string {
  const normalizedNewlines = text.replace(/\r\n?/g, '\n');
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap')
    return normalizedNewlines;
  if (whiteSpace === 'pre-line') {
    return normalizedNewlines
      .split('\n')
      .map(line => line.replace(/[\t ]+/g, ' ').trim())
      .join('\n');
  }
  return normalizedNewlines.replace(/\s+/g, ' ').trim();
}
