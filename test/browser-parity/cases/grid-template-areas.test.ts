import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('places and spans items through named grid template areas', async () => {
  await expectChromiumParity({
    viewport: { width: 800, height: 600 },
    html: `
      <style>
        #grid {
          position: absolute;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: 40px 60px 30px;
          grid-template-rows: 20px 30px;
          grid-template-areas:
            "header header header"
            "sidebar main .";
          gap: 5px;
        }
        #header { grid-area: header; }
        #sidebar { grid-area: sidebar; }
        #main { grid-area: main; }
      </style>
      <div id="grid">
        <div id="main"></div>
        <div id="header"></div>
        <div id="sidebar"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#grid' },
      { type: 'rect', selector: '#header' },
      { type: 'rect', selector: '#sidebar' },
      { type: 'rect', selector: '#main' },
    ],
  });
});

it('supports named areas that span multiple rows', async () => {
  await expectChromiumParity({
    viewport: { width: 800, height: 600 },
    html: `
      <style>
        #grid {
          position: absolute;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: 30px 50px;
          grid-template-rows: 15px 25px;
          grid-template-areas: "first tall" "second tall";
        }
        #first { grid-area: first; }
        #second { grid-area: second; }
        #tall { grid-area: tall; }
      </style>
      <div id="grid">
        <div id="tall"></div>
        <div id="second"></div>
        <div id="first"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#tall' },
    ],
  });
});

it('uses the full named-area template to size implicit tracks', async () => {
  await expectChromiumParity({
    viewport: { width: 800, height: 600 },
    html: `
      <style>
        #grid {
          position: absolute;
          top: 0;
          left: 0;
          display: grid;
          grid-template-areas: "named ." ". .";
          grid-auto-columns: 20px;
          grid-auto-rows: 15px;
        }
        #named { grid-area: named; }
      </style>
      <div id="grid"><div id="named"></div></div>
    `,
    queries: [
      { type: 'rect', selector: '#grid' },
      { type: 'rect', selector: '#named' },
    ],
  });
});
