import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('absolute overlap uses the higher z-index element at the point', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #back {
          position: absolute;
          left: 20px;
          top: 20px;
          width: 120px;
          height: 80px;
          z-index: 1;
        }

        #front {
          position: absolute;
          left: 40px;
          top: 40px;
          width: 120px;
          height: 80px;
          z-index: 2;
        }
      </style>
      <div id="back"></div>
      <div id="front"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});
