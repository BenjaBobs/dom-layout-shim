import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('aspect ratio resolves auto height from explicit width', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          width: 80px;
          aspect-ratio: 2 / 1;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});

it('aspect ratio resolves auto width from explicit height', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          position: absolute;
          height: 40px;
          aspect-ratio: 2 / 1;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});

it('aspect ratio follows a max constraint on the explicit axis', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          width: 200px;
          max-width: 100px;
          aspect-ratio: 2 / 1;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});
