import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('element scroll offsets descendant viewport rects and hit testing inside the scrollport', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    elementScrolls: [{ selector: '#scroller', x: 0, y: 40 }],
    html: `
      <style>
        body {
          margin: 0;
        }

        #scroller {
          position: relative;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 60px;
          overflow: auto;
        }

        #spacer {
          height: 160px;
        }

        #target {
          position: absolute;
          left: 20px;
          top: 70px;
          width: 50px;
          height: 30px;
        }
      </style>
      <div id="scroller">
        <div id="spacer"></div>
        <div id="target"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#scroller' },
      { type: 'rect', selector: '#target' },
      { type: 'point', x: 40, y: 55 },
      { type: 'point', x: 40, y: 95 },
    ],
  });
});
