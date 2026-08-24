import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('reports initial and resized content and border boxes through ResizeObserver', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>body { margin: 0 }</style>
      <div style="box-sizing:content-box;width:100px;height:40px;padding:10px;border:2px solid"></div>
    `,
    queries: [
      {
        type: 'resize-observer',
        selector: 'div',
        styleAfterInitial:
          'box-sizing:content-box;width:140px;height:60px;padding:10px;border:2px solid',
      },
    ],
  });
});
