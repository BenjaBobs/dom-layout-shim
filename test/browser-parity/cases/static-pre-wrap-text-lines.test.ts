import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('pre-wrap text preserves explicit line breaks', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 30px;
          white-space: pre-wrap;
        }
      </style>
      <div id="text">Hello
World</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('pre text preserves hard breaks without soft wrapping', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 40px;
          font-size: 20px;
          line-height: 30px;
          white-space: pre;
        }
      </style>
      <div id="text">Hello World
Again</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('pre-line text preserves hard breaks and collapses spaces', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 200px;
          font-size: 20px;
          line-height: 30px;
          white-space: pre-line;
        }
      </style>
      <div id="text">Hello    World
Again</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('br elements create hard breaks in text leaves', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 30px;
          white-space: pre-wrap;
        }
      </style>
      <div id="text">Hello<br>World</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});
