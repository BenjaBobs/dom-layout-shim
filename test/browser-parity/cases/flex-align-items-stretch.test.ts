import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('flex align items stretches auto cross sizes but preserves explicit sizes', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          align-items: stretch;
          width: 200px;
          height: 80px;
        }

        #auto {
          width: 40px;
        }

        #explicit {
          width: 40px;
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="auto"></div>
        <div id="explicit"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#auto' },
      { type: 'rect', selector: '#explicit' },
    ],
  });
});
