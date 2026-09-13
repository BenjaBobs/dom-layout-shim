import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('keeps ancestor overflow clips fixed when descendants translate into and out of them', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body { margin:0 } #clip { width:100px;height:100px;overflow:hidden } #child { width:100px;height:100px;transform:translateX(80px) } #enter { position:absolute;left:120px;top:0;width:20px;height:20px;transform:translateX(-100px) }</style><div id="clip" style="position:relative"><div id="child"></div><div id="enter"></div></div>`,
    queries: [
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 150, y: 10 },
      { type: 'point', x: 90, y: 10 },
      { type: 'point', x: 25, y: 10 },
      { type: 'intersection-observer', selector: '#child' },
    ],
  });
});

it('projects nested reflected clips in their owning coordinate spaces', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body { margin:0 } #outer { position:relative;left:100px;top:50px;width:100px;height:100px;overflow:hidden;transform:scaleX(-1) } #inner { width:80px;height:80px;overflow:hidden;transform:translateX(30px) } #child { width:100px;height:100px;transform:translateX(40px) }</style><div id="outer"><div id="inner"><div id="child"></div></div></div>`,
    queries: [
      { type: 'rect', selector: '#child' },
      ...[90, 110, 125, 145, 180, 210].map(x => ({
        type: 'point' as const,
        x,
        y: 60,
      })),
    ],
  });
});
