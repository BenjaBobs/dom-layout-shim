import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('relative offsets move the visual box without moving following flow layout', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #one {
          position: relative;
          left: 10px;
          top: 5px;
          width: 100px;
          height: 30px;
        }

        #two {
          width: 80px;
          height: 40px;
        }
      </style>
      <div id="one"></div>
      <div id="two"></div>
    `,
    queries: [
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
      { type: 'point', x: 5, y: 5 },
      { type: 'point', x: 15, y: 10 },
    ],
  });
});
