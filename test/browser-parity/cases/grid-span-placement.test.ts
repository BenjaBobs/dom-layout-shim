import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('grid span placement spans tracks from auto placement', async () => {
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
          grid-template-rows: 20px 10px;
          width: 200px;
        }

        #first {
          grid-column: span 2;
        }

        #second {
          grid-row: span 2;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
        <div id="third"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#third' },
    ],
  });
});

it('grid span placement spans tracks from explicit lines', async () => {
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
          grid-template-rows: 20px 10px;
          width: 200px;
        }

        #first {
          grid-column: 1 / span 2;
          grid-row: 1 / span 2;
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
