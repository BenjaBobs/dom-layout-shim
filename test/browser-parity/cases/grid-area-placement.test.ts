import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('grid-area shorthand places items with explicit numeric lines', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px 30px 20px;
          grid-template-rows: 20px 10px 15px;
          width: 200px;
        }

        #first {
          grid-area: 2 / 2 / 4 / 4;
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

it('grid-area shorthand supports span line values', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px 30px 20px;
          grid-template-rows: 20px 10px 15px;
          width: 200px;
        }

        #first {
          grid-area: 1 / 1 / span 2 / span 2;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  });
});
