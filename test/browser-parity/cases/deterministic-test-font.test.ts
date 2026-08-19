import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('uses repository-owned metrics for exact text wrapping', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 50px;
        }

        #natural-host {
          display: flex;
        }

        #natural {
          white-space: nowrap;
        }
      </style>
      <div id="text">ABCDE FGHIJ</div>
      <div id="natural-host"><div id="natural">ABCDE</div></div>
    `,
    queries: [
      { type: 'rect', selector: '#text' },
      { type: 'rect', selector: '#natural' },
    ],
  });
});
