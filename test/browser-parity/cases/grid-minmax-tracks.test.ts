import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('grid minmax tracks constrain fixed columns', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: minmax(60px, 80px) minmax(20px, 40px);
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
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  });
});

it('grid minmax tracks honor explicit row growth limits', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px;
          grid-template-rows: minmax(30px, 50px) minmax(20px, 40px);
          width: 100px;
          height: 140px;
          align-content: start;
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

it('grid minmax auto tracks size implicit columns', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-auto-columns: minmax(40px, 60px);
          grid-auto-flow: column;
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
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  });
});

it('grid minmax auto tracks size implicit rows', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px;
          grid-auto-rows: minmax(30px, 50px);
          width: 100px;
          height: 100px;
          align-content: start;
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

it('grid minmax auto tracks size empty implicit rows in auto-height grids', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px;
          grid-auto-rows: minmax(30px, 50px);
          width: 100px;
          align-content: start;
        }

        #third {
          grid-row: 3;
        }
      </style>
      <div id="parent">
        <div id="third"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#third' },
    ],
  });
});
