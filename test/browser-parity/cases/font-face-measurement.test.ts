// @ts-expect-error -- opentype.js has no bundled declaration file
import opentype from 'opentype.js';
import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

const font = new opentype.Font({
  familyName: 'Fixture Metrics',
  styleName: 'Regular',
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  glyphs: [
    new opentype.Glyph({
      name: '.notdef',
      advanceWidth: 500,
      path: new opentype.Path(),
    }),
    new opentype.Glyph({
      name: 'A',
      unicode: 65,
      advanceWidth: 900,
      path: new opentype.Path(),
    }),
    new opentype.Glyph({
      name: 'B',
      unicode: 66,
      advanceWidth: 300,
      path: new opentype.Path(),
    }),
  ],
});
const fontData = Buffer.from(font.toArrayBuffer()).toString('base64');

it('discovers a data URL font face and uses its glyph advances', async () => {
  await expectChromiumParity({
    viewport: { width: 200, height: 100 },
    html: `
      <style>
        @font-face {
          font-family: 'Fixture Metrics';
          font-weight: 400;
          src: url(data:font/otf;base64,${fontData}) format('opentype');
        }
        body { margin: 0; }
        #label {
          display: inline-flex;
          box-sizing: border-box;
          min-width: 0;
          padding: 0;
          border: 0;
          font-family: 'Fixture Metrics';
          font-size: 20px;
          line-height: 20px;
        }
      </style>
      <button id="label">AB</button>
    `,
    queries: [{ type: 'rect', selector: '#label' }],
  });
});
