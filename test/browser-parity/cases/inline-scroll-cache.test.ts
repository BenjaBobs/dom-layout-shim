import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('keeps inline fragments aligned after a warmed layout is scrolled', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    elementScrolls: [{ selector: '#scroller', x: 0, y: 20 }],
    html: `<style>body { margin:0 }</style>
      <div id="scroller" style="width:100px;height:40px;overflow:auto">
        <div style="height:200px"><span id="label">abcde fghij klmno</span></div>
      </div>`,
    queries: [
      { type: 'client-rects', selector: '#label' },
      { type: 'rect', selector: '#label' },
    ],
  });
});
