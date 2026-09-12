import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('display none removes the element from hit testing and layout rects', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          display: none;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }
      </style>
      <div id="target"></div>
      <div id="hidden"></div>
    `,
    queries: [
      { type: 'point', x: 50, y: 50 },
      { type: 'rect', selector: '#hidden' },
    ],
  });
});

for (const declaration of [
  'display: none !important',
  'display: none !IMPORTANT; display: block',
  'display: block !important; display: none !important',
]) {
  it(`inline ${declaration} removes boxes and hit targets`, async () => {
    await expectChromiumParity({
      viewport: { width: 300, height: 200 },
      html: `
        <style>
          body { margin: 0; }
          #hidden { display: block; width: 100px; height: 100px; }
          #target { width: 100px; height: 100px; }
        </style>
        <div id="hidden" style="${declaration}"><div id="child">Hidden</div></div>
        <div id="target"></div>
      `,
      queries: [
        { type: 'rect', selector: '#hidden' },
        { type: 'rect', selector: '#child' },
        { type: 'rect', selector: '#target' },
        { type: 'point', x: 50, y: 50 },
      ],
    });
  });
}
