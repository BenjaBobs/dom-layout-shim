import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('border width contributes nothing when border style is none', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          border-style: none;
          border-width: 10px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});
