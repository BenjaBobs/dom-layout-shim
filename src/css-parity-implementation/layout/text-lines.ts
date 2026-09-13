import type { WhiteSpace } from '../../api/text-measurer.ts';

export function normalizeWhitespace(
  text: string,
  whiteSpace: WhiteSpace,
): string {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') return normalized;
  if (whiteSpace === 'pre-line') {
    return normalized
      .split('\n')
      .map(line => line.replace(/[\t \f\v]+/g, ' ').trim())
      .join('\n');
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

export function breakTextLines(
  text: string,
  whiteSpace: WhiteSpace,
  maxWidth: number | undefined,
  widthOf: (text: string) => number,
): string[] {
  const normalized = normalizeWhitespace(text, whiteSpace);
  if (!normalized) return [];
  const hardLines = normalized.split('\n');
  if (
    whiteSpace === 'pre' ||
    whiteSpace === 'nowrap' ||
    !maxWidth ||
    maxWidth <= 0
  )
    return hardLines;
  return breakLineRanges(normalized, maxWidth, (start, end) =>
    widthOf(normalized.slice(start, end)),
  ).map(range => normalized.slice(range.start, range.end));
}

export function breakLineRanges(
  text: string,
  maxWidth: number,
  widthOf: (start: number, end: number) => number,
): { start: number; end: number }[] {
  const lines: { start: number; end: number }[] = [];
  let offset = 0;
  for (const hardLine of text.split('\n')) {
    let start = offset;
    let end = offset;
    for (const word of hardLine.split(' ')) {
      const candidateEnd = end + (end > start ? 1 : 0) + word.length;
      if (end > start && widthOf(start, candidateEnd) > maxWidth) {
        lines.push({ start, end });
        start = end + 1;
      }
      end = candidateEnd;
    }
    lines.push({ start, end });
    offset += hardLine.length + 1;
  }
  return lines;
}
