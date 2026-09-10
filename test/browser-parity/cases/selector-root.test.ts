import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('matches the document root and inherits tokens with pseudo-class specificity', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body { margin: 0; }
        :root { --width: 80px; --height: 20px; }
        html { --width: 10px; }
        html:root { --height: 30px; }
        :root { --height: 10px; }
        :where(:root) { --width: 5px; --left: 12px; }
        :is(:root) { --top: 14px; }
        :root > body .box {
          position: absolute;
          left: var(--left, 0px);
          top: var(--top, 0px);
          width: var(--width, 1px);
          height: var(--height, 1px);
        }
        body:root, .box:root { --width: 150px; }
        .box:not(:root) { padding: 2px; }
      </style>
      <div><div id="box" class="box"></div></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  });
});
