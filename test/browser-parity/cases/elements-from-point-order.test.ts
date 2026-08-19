import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('elementsFromPoint returns elements in visual stacking order', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #bottom,
        #middle,
        #top {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #bottom {
          z-index: 1;
        }

        #middle {
          z-index: 2;
        }

        #top {
          z-index: 3;
        }
      </style>
      <div id="bottom"></div>
      <div id="top"></div>
      <div id="middle"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('keeps a high-z-index child inside its parent stacking context', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #lower,
        #upper {
          position: absolute;
          inset: 0;
          width: 100px;
          height: 100px;
        }
        #lower { z-index: 1; }
        #lower-child { position: absolute; inset: 0; z-index: 999; }
        #upper { z-index: 2; }
      </style>
      <div id="lower"><div id="lower-child"></div></div>
      <div id="upper"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('paints positioned descendants above their stacking-context background', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #context { position: relative; z-index: 1; width: 100px; height: 100px; }
        #child { position: absolute; inset: 0; }
      </style>
      <div id="context"><div id="child"></div></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});
