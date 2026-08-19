import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('hr applies native border and vertical margins in block flow', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          padding: 1px;
        }

        #before,
        #after {
          width: 30px;
          height: 10px;
        }
      </style>
      <div id="host">
        <div id="before"></div>
        <hr id="rule">
        <div id="after"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#rule' },
      { type: 'dimensions', selector: '#rule' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('author width and margin override hr native defaults while preserving the native border', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        hr {
          margin: 0;
          width: 100px;
        }
      </style>
      <hr id="rule">
    `,
    queries: [
      { type: 'rect', selector: '#rule' },
      { type: 'dimensions', selector: '#rule' },
    ],
  });
});
