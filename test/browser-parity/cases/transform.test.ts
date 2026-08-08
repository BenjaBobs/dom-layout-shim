import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('translation changes geometry and hit testing without changing sibling flow or offsets', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        .box { width: 100px; height: 40px; }
        #moved { transform: translate(50px, 20px); }
      </style>
      <div id="moved" class="box"></div>
      <div id="sibling" class="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#moved' },
      { type: 'rect', selector: '#sibling' },
      { type: 'dimensions', selector: '#moved' },
      { type: 'point', x: 60, y: 25 },
      { type: 'point', x: 10, y: 10 },
    ],
  })
})

it('scale uses the default center origin and keeps layout dimensions unchanged', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        #box {
          position: absolute;
          left: 100px;
          top: 100px;
          width: 100px;
          height: 40px;
          transform: scale(2, 0.5);
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'dimensions', selector: '#box' },
      { type: 'point', x: 60, y: 115 },
      { type: 'point', x: 60, y: 100 },
    ],
  })
})

it('transform origin and function order match Chromium', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        .box {
          position: absolute;
          top: 40px;
          width: 50px;
          height: 30px;
          transform-origin: left top;
        }
        #translate-scale { left: 100px; transform: translateX(20px) scaleX(2); }
        #scale-translate { left: 250px; transform: scaleX(2) translateX(20px); }
        #percentage-origin {
          left: 380px;
          transform: scale(2);
          transform-origin: 25% 75%;
        }
      </style>
      <div id="translate-scale" class="box"></div>
      <div id="scale-translate" class="box"></div>
      <div id="percentage-origin" class="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#translate-scale' },
      { type: 'rect', selector: '#scale-translate' },
      { type: 'rect', selector: '#percentage-origin' },
    ],
  })
})

it('percentage translation resolves against the transformed border box', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        #box {
          position: absolute;
          left: 100px;
          top: 100px;
          width: 100px;
          height: 40px;
          transform: translate(50%, 100%);
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  })
})

it('ancestor transforms propagate to descendant geometry and hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    html: `
      <style>
        body { margin: 0; }
        #parent {
          position: absolute;
          left: 50px;
          top: 50px;
          width: 100px;
          height: 100px;
          transform: translate(20px, 30px) scale(2);
        }
        #child {
          position: absolute;
          left: 10px;
          top: 10px;
          width: 20px;
          height: 20px;
        }
      </style>
      <div id="parent"><div id="child"></div></div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 0, y: 10 },
    ],
  })
})

it('individual translate and scale properties compose before transform functions', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        #stylesheet-box {
          position: absolute;
          left: 50px;
          top: 50px;
          width: 100px;
          height: 40px;
          translate: 20px 10px;
          scale: 2 0.5;
          transform: translateX(10px);
          transform-origin: left top;
        }
      </style>
      <div id="stylesheet-box"></div>
      <div
        id="inline-box"
        style="position:absolute; left:250px; top:100px; width:100px; height:40px; translate:50% 10px; scale:150% 2"
      ></div>
    `,
    queries: [
      { type: 'rect', selector: '#stylesheet-box' },
      { type: 'dimensions', selector: '#stylesheet-box' },
      { type: 'rect', selector: '#inline-box' },
      { type: 'point', x: 100, y: 65 },
    ],
  })
})
