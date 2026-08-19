import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('matches adjacent and general sibling combinators', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        .box {
          position: absolute;
          left: 0;
          top: 0;
          width: 20px;
          height: 20px;
        }

        .adjacent-origin + .adjacent-target {
          left: 30px;
        }

        .general-origin ~ .general-target {
          top: 40px;
        }

        .scope > .nested-origin + .nested-target {
          left: 60px;
          top: 80px;
        }
      </style>

      <div class="adjacent-origin"></div>
      text nodes do not interrupt element adjacency
      <div id="adjacent-match" class="box adjacent-target"></div>

      <div class="adjacent-origin"></div>
      <div></div>
      <div id="adjacent-miss" class="box adjacent-target"></div>

      <div id="general-before" class="box general-target"></div>
      <div class="general-origin"></div>
      <div></div>
      <div id="general-match" class="box general-target"></div>

      <div class="scope">
        <div class="nested-origin"></div>
        <div id="nested-match" class="box nested-target"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#adjacent-match' },
      { type: 'rect', selector: '#adjacent-miss' },
      { type: 'rect', selector: '#general-before' },
      { type: 'rect', selector: '#general-match' },
      { type: 'rect', selector: '#nested-match' },
    ],
  });
});
