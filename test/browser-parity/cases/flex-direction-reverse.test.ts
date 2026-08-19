import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('flex row-reverse lays out children from the inline end', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-direction: row-reverse;
          width: 200px;
          height: 50px;
        }

        #first {
          width: 40px;
          height: 20px;
        }

        #second {
          width: 30px;
          height: 10px;
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
      { type: 'point', x: 185, y: 10 },
      { type: 'point', x: 145, y: 10 },
    ],
  });
});

it('flex column-reverse lays out children from the block end', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-direction: column-reverse;
          width: 100px;
          height: 100px;
        }

        #first {
          width: 40px;
          height: 20px;
        }

        #second {
          width: 30px;
          height: 10px;
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
      { type: 'point', x: 10, y: 85 },
      { type: 'point', x: 10, y: 70 },
    ],
  });
});
