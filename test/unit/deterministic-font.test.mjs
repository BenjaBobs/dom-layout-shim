import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import opentype from 'opentype.js';
import { describe, expect, it } from 'vitest';

const fontPath = resolve(
  process.cwd(),
  'test/browser-parity/assets/fonts/deterministic-layout.otf',
);

describe('deterministic parity font', () => {
  it('encodes the cross-platform metric contract in the generated binary', async () => {
    const bytes = await readFile(fontPath);
    const font = opentype.parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );

    expect(font.getEnglishName('fontFamily')).toBe(
      'DOM Layout Shim Deterministic',
    );
    expect(font.getEnglishName('fontSubfamily')).toBe('Regular');
    expect(font.unitsPerEm).toBe(1000);
    expect(font.ascender).toBe(800);
    expect(font.descender).toBe(-200);
    expect(font.tables.hhea.lineGap).toBe(0);

    expect(font.tables.os2).toMatchObject({
      usWeightClass: 400,
      xAvgCharWidth: 500,
      sTypoAscender: 800,
      sTypoDescender: -200,
      sTypoLineGap: 0,
      usWinAscent: 800,
      usWinDescent: 200,
      usFirstCharIndex: 0x20,
      usLastCharIndex: 0x7e,
    });
    expect(font.tables.os2.fsSelection & (1 << 7)).not.toBe(0);

    expect(font.tables.post).toMatchObject({
      isFixedPitch: 1,
      underlinePosition: -100,
      underlineThickness: 50,
    });

    for (let codePoint = 0x20; codePoint <= 0x7e; codePoint += 1) {
      const character = String.fromCodePoint(codePoint);
      expect(
        font.hasChar(character),
        `missing ${JSON.stringify(character)}`,
      ).toBe(true);
      expect(
        font.charToGlyph(character).advanceWidth,
        JSON.stringify(character),
      ).toBe(500);
    }

    expect(font.hasChar(String.fromCodePoint(0x7f))).toBe(false);
    expect(font.kerningPairs).toEqual({});
  });
});
