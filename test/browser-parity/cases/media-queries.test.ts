import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('applies matching media types, ranges, orientation, aspect ratio, lists, and nested rules', async () => {
  await expectChromiumParity({
    viewport: { width: 800, height: 600 },
    html: `
      <style>
        #box { position: absolute; top: 0; width: 10px; height: 10px; }
        @media screen and (min-width: 500px) {
          #box { width: 100px; }
        }
        @media (max-height: 700px) and (orientation: landscape) {
          #box { height: 50px; }
        }
        @media print {
          #box { width: 200px; }
        }
        @media (max-width: 100px), (aspect-ratio: 4 / 3) {
          #box { left: 20px; }
        }
        @media (min-width: 700px) {
          @media (max-width: 900px) {
            #box { top: 30px; }
          }
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});

it('selects narrow portrait rules from the configured viewport', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 640 },
    html: `
      <style>
        #box { position: absolute; top: 0; width: 10px; height: 10px; }
        @media (max-width: 400px) { #box { width: 120px; } }
        @media (orientation: portrait) { #box { height: 60px; } }
        @media not print and (min-width: 1px) { #box { left: 15px; } }
        @media (min-width: 500px) { #box { width: 200px; } }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});
