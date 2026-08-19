import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('closed details lays out summary but suppresses remaining content from flow and hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 260 },
    html: `
      <style>
        body {
          margin: 0;
        }

        summary {
          width: 100px;
          height: 20px;
        }

        #closed-content,
        #open-content,
        #after {
          width: 80px;
          height: 30px;
        }
      </style>
      <details id="closed">
        <summary id="closed-summary"></summary>
        <div id="closed-content"></div>
      </details>
      <details id="open" open>
        <summary id="open-summary"></summary>
        <div id="open-content"></div>
      </details>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#closed' },
      { type: 'rect', selector: '#closed-summary' },
      { type: 'rect', selector: '#open' },
      { type: 'rect', selector: '#open-summary' },
      { type: 'rect', selector: '#open-content' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 10, y: 10 },
      { type: 'point', x: 10, y: 25 },
      { type: 'point', x: 10, y: 45 },
    ],
  });
});
