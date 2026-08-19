import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('dom order breaks z-index ties', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #first,
        #second {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="first"></div>
      <div id="second"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});
