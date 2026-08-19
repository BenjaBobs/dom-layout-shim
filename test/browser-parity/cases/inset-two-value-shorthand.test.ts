import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('two-value inset shorthand applies vertical and horizontal offsets', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #panel {
          position: fixed;
          inset: 10px 20px;
        }
      </style>
      <div id="panel"></div>
    `,
    queries: [
      { type: 'rect', selector: '#panel' },
      { type: 'point', x: 19, y: 100 },
      { type: 'point', x: 20, y: 100 },
    ],
  });
});

it('percentage insets resolve against the containing block', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        #containing-block { position: relative; width: 200px; height: 120px; }
        #physical { position: absolute; top: 50%; left: 25%; width: 20px; height: 10px; }
        #logical { position: absolute; inset-block-start: 25%; inset-inline-end: 10%; width: 20px; height: 10px; }
      </style>
      <div id="containing-block">
        <div id="physical"></div>
        <div id="logical"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#physical' },
      { type: 'rect', selector: '#logical' },
    ],
  });
});
