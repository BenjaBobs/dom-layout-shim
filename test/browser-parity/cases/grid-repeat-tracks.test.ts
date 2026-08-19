import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('grid repeat tracks expand fixed counts', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: repeat(2, 1fr 20px);
          grid-template-rows: repeat(2, 15px);
          width: 200px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
        <div id="third"></div>
        <div id="fourth"></div>
        <div id="fifth"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#third' },
      { type: 'rect', selector: '#fourth' },
      { type: 'rect', selector: '#fifth' },
    ],
  });
});
