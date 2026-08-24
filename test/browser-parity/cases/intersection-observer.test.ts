import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('reports viewport intersection geometry and threshold crossings', async () => {
  await expectChromiumParity({
    viewport: { width: 200, height: 100 },
    html: `
      <style>body { margin: 0 }</style>
      <div style="position:absolute;left:150px;top:0;width:100px;height:40px"></div>
    `,
    queries: [
      {
        type: 'intersection-observer',
        selector: 'div',
        threshold: [0, 0.5, 1],
        styleAfterInitial:
          'position:absolute;left:175px;top:0;width:100px;height:40px',
      },
    ],
  });
});

it('applies an element root and root margin', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>body { margin: 0 }</style>
      <div id="root" style="position:absolute;left:20px;top:20px;width:100px;height:100px">
        <div id="target" style="position:absolute;left:90px;top:0;width:20px;height:20px"></div>
      </div>
    `,
    queries: [
      {
        type: 'intersection-observer',
        selector: '#target',
        root: '#root',
        rootMargin: '0px 10px',
      },
    ],
  });
});
