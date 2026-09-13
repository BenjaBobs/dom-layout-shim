import type { Box } from '../../api/box.ts';
import type { TextMeasurer } from '../../api/text-measurer.ts';
import type { SupportedStyle } from '../css/supported-style.ts';
import { breakLineRanges } from './text-lines.ts';

export type InlineRun = {
  text: string;
  style: SupportedStyle;
  owners: readonly Element[];
};
export type InlineLayout = {
  width: number;
  height: number;
  fragments: Map<Element, Box[]>;
};

export function createInlineFormatter(
  runs: readonly InlineRun[],
  strut: SupportedStyle,
  measurer: TextMeasurer,
): (width: number) => InlineLayout {
  const characters: { character: string; run: InlineRun }[] = [];
  for (const run of runs) {
    let text = run.text;
    if (run.style.textTransform === 'uppercase') text = text.toUpperCase();
    else if (run.style.textTransform === 'lowercase') text = text.toLowerCase();
    else if (run.style.textTransform === 'capitalize')
      text = text.replace(/\b\w/g, value => value.toUpperCase());
    for (const character of text.replace(/\r\n?/g, '\n').split('')) {
      const preserve =
        run.style.whiteSpace === 'pre' || run.style.whiteSpace === 'pre-wrap';
      if (!preserve && /[\t \f\v]/.test(character)) {
        if (
          !characters.length ||
          characters.at(-1)?.character === ' ' ||
          characters.at(-1)?.character === '\n'
        )
          continue;
        characters.push({ character: ' ', run });
      } else characters.push({ character, run });
    }
  }
  if (strut.whiteSpace !== 'pre' && strut.whiteSpace !== 'pre-wrap') {
    while (characters.at(-1)?.character === ' ') characters.pop();
  }
  const text = characters.map(entry => entry.character).join('');
  const widthOf = (start: number, end: number) => {
    let width = 0;
    for (let index = start; index < end; ) {
      const run = characters[index]?.run;
      if (!run) break;
      let stop = index + 1;
      while (stop < end && characters[stop]?.run === run) stop++;
      width += measurer.measure({
        text: text.slice(index, stop),
        ...run.style,
        whiteSpace: 'pre',
        maxWidth: undefined,
      }).width;
      index = stop;
    }
    return width;
  };
  const cache = new Map<number, InlineLayout>();
  return availableWidth => {
    const cached = cache.get(availableWidth);
    if (cached) return cached;
    const fragments = new Map<Element, Box[]>();
    let width = 0;
    let y = 0;
    const wrapWidth =
      strut.whiteSpace === 'pre' || strut.whiteSpace === 'nowrap'
        ? Number.MAX_SAFE_INTEGER
        : availableWidth;
    for (const line of text ? breakLineRanges(text, wrapWidth, widthOf) : []) {
      let ascent = strut.lineHeight / 2 + strut.fontSize * 0.3;
      let descent = strut.lineHeight / 2 - strut.fontSize * 0.3;
      for (let index = line.start; index < line.end; index++) {
        const style = characters[index]?.run.style;
        if (!style) continue;
        // The portable typography profile uses an 80% ascent / 20% descent.
        // Keep the same em-box baseline for measuring and recording fragments.
        ascent = Math.max(ascent, style.lineHeight / 2 + style.fontSize * 0.3);
        descent = Math.max(
          descent,
          style.lineHeight / 2 - style.fontSize * 0.3,
        );
      }
      const lineFragments = new Map<Element, Box>();
      let x = 0;
      for (let index = line.start; index < line.end; ) {
        const run = characters[index]?.run;
        if (!run) break;
        let stop = index + 1;
        while (stop < line.end && characters[stop]?.run === run) stop++;
        const advance = widthOf(index, stop);
        for (const owner of run.owners) {
          const box = {
            x,
            y: y + ascent - run.style.fontSize * 0.8,
            width: advance,
            height: run.style.fontSize,
          };
          const existing = lineFragments.get(owner);
          if (existing) {
            const right = Math.max(
              existing.x + existing.width,
              box.x + box.width,
            );
            const bottom = Math.max(
              existing.y + existing.height,
              box.y + box.height,
            );
            existing.y = Math.min(existing.y, box.y);
            existing.width = right - existing.x;
            existing.height = bottom - existing.y;
          } else lineFragments.set(owner, box);
        }
        x += advance;
        index = stop;
      }
      for (const [owner, box] of lineFragments) {
        const boxes = fragments.get(owner) ?? [];
        boxes.push(box);
        fragments.set(owner, boxes);
      }
      const breakEntry = characters[line.end];
      if (
        breakEntry &&
        (breakEntry.character === '\n' ||
          (breakEntry.character === ' ' &&
            breakEntry.run.style.whiteSpace === 'pre-wrap'))
      ) {
        // Chromium exposes preserved breaking spaces and hard breaks as
        // separate inline fragments; a hard break has a zero-width em box.
        const style = breakEntry.run.style;
        const advance =
          breakEntry.character === '\n' ? 0 : widthOf(line.end, line.end + 1);
        for (const owner of breakEntry.run.owners) {
          const boxes = fragments.get(owner) ?? [];
          boxes.push({
            x,
            y: y + ascent - style.fontSize * 0.8,
            width: advance,
            height: style.fontSize,
          });
          fragments.set(owner, boxes);
        }
      }
      width = Math.max(width, x);
      y += ascent + descent;
    }
    const result = { width, height: y, fragments };
    cache.set(availableWidth, result);
    return result;
  };
}
