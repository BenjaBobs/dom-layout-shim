import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('grid gap contributes to child placement', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px 30px;
          grid-template-rows: 20px 10px;
          gap: 7px 11px;
          width: 200px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
        <div id="third"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#third' },
    ],
  });
});

it('grid percentage column gap resolves against container width', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px 30px;
          column-gap: 10%;
          width: 200px;
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

it('grid percentage row gap resolves against container height', async () => {
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
          grid-template-rows: 20px 30px;
          row-gap: 10%;
          width: 200px;
          height: 100px;
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
