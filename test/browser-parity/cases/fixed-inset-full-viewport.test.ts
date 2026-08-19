import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('fixed inset zero fills the viewport', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #backdrop {
          position: fixed;
          inset: 0;
        }
      </style>
      <div id="backdrop"></div>
    `,
    queries: [
      { type: 'rect', selector: '#backdrop' },
      { type: 'point', x: 299, y: 199 },
    ],
  });
});
