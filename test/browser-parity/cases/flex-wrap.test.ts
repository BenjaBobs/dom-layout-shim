import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('flex wrap moves overflowing items onto a new line', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-wrap: wrap;
          width: 100px;
          row-gap: 5px;
        }

        #first {
          width: 70px;
          height: 20px;
        }

        #second {
          width: 40px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  });
});
