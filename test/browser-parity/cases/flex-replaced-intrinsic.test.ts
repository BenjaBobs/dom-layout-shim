import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('replaced element intrinsic size participates in flex layout', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 200px;
        }

        #box {
          width: 40px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <img id="logo" width="24" height="16" alt="">
        <div id="box"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#logo' },
      { type: 'rect', selector: '#box' },
    ],
  });
});
