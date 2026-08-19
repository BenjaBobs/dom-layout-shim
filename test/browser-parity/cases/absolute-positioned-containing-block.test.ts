import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('absolute positioned children use the positioned parent containing block', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          left: 5px;
          top: 10px;
          width: 100px;
          height: 80px;
          padding: 10px;
          border-style: solid;
          border-width: 2px;
        }

        #child {
          position: absolute;
          left: 3px;
          top: 4px;
          width: 20px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 10, y: 16 },
    ],
  });
});
