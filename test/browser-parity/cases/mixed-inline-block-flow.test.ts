import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('inline content after a block child contributes a following line box', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; }
        #host { width: 240px; font-size: 14px; line-height: 22px; }
        h2 { margin: 0 0 4px; font-size: 24px; line-height: 38px; }
      </style>
      <div id="host"><h2 id="heading">Task workspace</h2><span id="secondary">Compatibility scenario</span></div>
      <div id="after" style="width: 20px; height: 10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#host' },
      { type: 'rect', selector: '#secondary' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('stacked text blocks determine a flex item and row intrinsic height', async () => {
  await expectChromiumParity({
    viewport: { width: 360, height: 240 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; }
        #row {
          display: flex;
          box-sizing: border-box;
          align-items: center;
          width: 320px;
          padding: 8px 48px 8px 16px;
          border-bottom: 1px solid;
        }
        #copy { flex: 1 1 auto; min-width: 0; margin: 6px 0; }
        p { display: block; margin: 0; }
        #primary { font-size: 16px; line-height: 24px; }
        #secondary { font-size: 14px; line-height: 20px; }
        #badge { width: 40px; height: 20px; flex: 0 0 auto; }
      </style>
      <div id="row">
        <div id="copy">
          <p id="primary">Prepare the compatibility release</p>
          <p id="secondary">Review the generated discrepancy report before publishing it.</p>
        </div>
        <div id="badge"></div>
      </div>
      <div id="after" style="width: 20px; height: 10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#copy' },
      { type: 'rect', selector: '#primary' },
      { type: 'rect', selector: '#secondary' },
      { type: 'rect', selector: '#after' },
    ],
  });
});
