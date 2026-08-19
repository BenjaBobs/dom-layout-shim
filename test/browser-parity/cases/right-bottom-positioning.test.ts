import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('right and bottom position an absolute box from the viewport edges', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          right: 25px;
          bottom: 30px;
          width: 50px;
          height: 40px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'point', x: 250, y: 150 },
    ],
  });
});
