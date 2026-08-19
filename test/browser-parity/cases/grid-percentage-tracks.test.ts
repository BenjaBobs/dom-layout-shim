import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('grid percentage tracks resolve against grid container size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 50% 25%;
          grid-template-rows: 20px;
          width: 200px;
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

it('grid percentage row tracks resolve against a definite container height', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px;
          grid-template-rows: 50% 25%;
          width: 200px;
          height: 120px;
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
