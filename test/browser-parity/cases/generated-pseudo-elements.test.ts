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

it('generated block boxes contribute their own dimensions and spacing to flow', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; }
        #generated::before {
          content: "before";
          display: block;
          width: 40px;
          height: 12px;
          margin-bottom: 3px;
          padding-top: 2px;
        }
        #generated::after {
          content: "after";
          display: block;
          width: 30px;
          height: 8px;
        }
        #after { width: 10px; height: 10px; }
      </style>
      <div id="generated">ordinary content</div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#generated' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('generated boxes participate as flex and grid items', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; }
        #flex {
          display: flex;
          width: 100px;
          height: 20px;
          gap: 5px;
        }
        #flex::before {
          content: "";
          display: block;
          width: 20px;
          flex: none;
        }
        #flex::after {
          content: "";
          display: block;
          width: 10px;
          flex: none;
        }
        #flex-child { width: 15px; flex: none; }
        #grid {
          display: grid;
          grid-template-columns: 25px 35px 45px;
          height: 10px;
        }
        #grid::before { content: ""; display: block; }
        #grid::after { content: ""; display: block; }
      </style>
      <div id="flex"><div id="flex-child"></div></div>
      <div id="grid"><div id="grid-child"></div></div>
    `,
    queries: [
      { type: 'rect', selector: '#flex-child' },
      { type: 'rect', selector: '#grid-child' },
    ],
  });
});
