import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('flex auto main-axis margins absorb positive free space', async () => {
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
          height: 50px;
        }

        #first,
        #second {
          width: 40px;
          height: 20px;
        }

        #second {
          margin-left: auto;
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

it('flex auto cross-axis margins override stretch alignment', async () => {
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
          height: 100px;
          align-items: stretch;
        }

        #child {
          width: 40px;
          height: 20px;
          margin-top: auto;
          margin-bottom: auto;
        }
      </style>
      <div id="parent">
        <div id="child">x</div>
      </div>
    `,
    queries: [{ type: 'rect', selector: '#child' }],
  });
});
