import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('before and after generated text contributes intrinsic size and block flow', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; font-size: 10px; line-height: 12px; }
        #generated::before { content: "A"; }
        #generated::after { content: attr(data-suffix); }
        #after { height: 10px; }
        #intrinsic { position: absolute; left: 100px; top: 0; }
        #intrinsic::before { content: "AB"; }
        #intrinsic::after { content: "C"; }
      </style>
      <div id="generated" data-suffix="B"></div>
      <div id="after"></div>
      <div id="intrinsic"></div>
    `,
    queries: [
      { type: 'rect', selector: '#generated' },
      { type: 'rect', selector: '#after' },
      { type: 'rect', selector: '#intrinsic' },
    ],
  });
});
