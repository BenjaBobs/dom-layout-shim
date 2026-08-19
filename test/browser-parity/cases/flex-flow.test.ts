import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('flex-flow sets direction and wrapping', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-flow: row wrap;
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

it('flex-flow supports reverse direction and wrap-reverse', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-flow: column-reverse wrap-reverse;
          width: 85px;
          height: 70px;
          column-gap: 5px;
        }

        .child {
          width: 40px;
          height: 50px;
        }
      </style>
      <div id="parent">
        <div id="first" class="child"></div>
        <div id="second" class="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  });
});
