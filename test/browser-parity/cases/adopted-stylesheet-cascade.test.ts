import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('applies adopted stylesheets after document stylesheets', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        .box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
        }
      </style>
      <div id="box" class="box"></div>
    `,
    adoptedStylesheets: [
      '.box { left: 30px; width: 120px; }',
      '.box { left: 40px; }',
    ],
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'dimensions', selector: '#box' },
    ],
  });
});
