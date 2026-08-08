import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('sticks a toolbar to the top of its nearest scroll container', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    elementScrolls: [{ selector: '#scroller', x: 0, y: 50 }],
    html: `
      <style>
        body { margin: 0; }
        #scroller {
          position: relative;
          left: 10px;
          top: 20px;
          width: 120px;
          height: 80px;
          overflow: auto;
        }
        #toolbar {
          position: sticky;
          top: 5px;
          width: 120px;
          height: 30px;
        }
        #content { height: 240px; }
      </style>
      <div id="scroller">
        <div id="toolbar"></div>
        <div id="content"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#scroller' },
      { type: 'rect', selector: '#toolbar' },
      { type: 'dimensions', selector: '#toolbar' },
      { type: 'point', x: 20, y: 30 },
    ],
  })
})

it('sticks against the viewport when no scrolling ancestor exists', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    scroll: { x: 0, y: 80 },
    html: `
      <style>
        body { margin: 0; min-height: 500px; }
        #before { height: 60px; }
        #toolbar {
          position: sticky;
          top: 10px;
          width: 100px;
          height: 30px;
        }
        #after { height: 300px; }
      </style>
      <div id="before"></div>
      <div id="toolbar"></div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#toolbar' },
      { type: 'dimensions', selector: '#toolbar' },
      { type: 'point', x: 20, y: 20 },
    ],
  })
})

it('sticks horizontally inside a scrolled container', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    elementScrolls: [{ selector: '#scroller', x: 40, y: 0 }],
    html: `
      <style>
        body { margin: 0; }
        #scroller {
          position: relative;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 60px;
          overflow: auto;
        }
        #content { width: 240px; height: 60px; }
        #sticky {
          position: sticky;
          left: 5px;
          width: 30px;
          height: 30px;
        }
      </style>
      <div id="scroller">
        <div id="content">
          <div id="sticky"></div>
        </div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#sticky' },
      { type: 'dimensions', selector: '#sticky' },
      { type: 'point', x: 20, y: 30 },
    ],
  })
})

it('stops at the end of its containing block', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    elementScrolls: [{ selector: '#scroller', x: 0, y: 80 }],
    html: `
      <style>
        body { margin: 0; }
        #scroller {
          position: relative;
          left: 10px;
          top: 20px;
          width: 120px;
          height: 80px;
          overflow: auto;
        }
        #wrapper { height: 60px; }
        #sticky {
          position: sticky;
          top: 0;
          width: 120px;
          height: 30px;
        }
        #after { height: 200px; }
      </style>
      <div id="scroller">
        <div id="wrapper"><div id="sticky"></div></div>
        <div id="after"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#wrapper' },
      { type: 'rect', selector: '#sticky' },
      { type: 'point', x: 20, y: 25 },
    ],
  })
})

it('honors physical bottom and right sticky insets', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    html: `
      <style>
        body { margin: 0; }
        #vertical {
          position: absolute;
          left: 10px;
          top: 10px;
          width: 80px;
          height: 80px;
          overflow: auto;
        }
        #before-bottom { height: 100px; }
        #bottom {
          position: sticky;
          bottom: 5px;
          width: 40px;
          height: 20px;
        }
        #after-bottom { height: 100px; }
        #horizontal {
          position: absolute;
          left: 120px;
          top: 10px;
          width: 80px;
          height: 50px;
          overflow: auto;
        }
        #row { display: flex; width: 220px; }
        #before-right { width: 100px; height: 20px; flex: none; }
        #right {
          position: sticky;
          right: 5px;
          width: 20px;
          height: 20px;
          flex: none;
        }
      </style>
      <div id="vertical">
        <div id="before-bottom"></div>
        <div id="bottom"></div>
        <div id="after-bottom"></div>
      </div>
      <div id="horizontal">
        <div id="row">
          <div id="before-right"></div>
          <div id="right"></div>
        </div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#bottom' },
      { type: 'rect', selector: '#right' },
    ],
  })
})

it('sticks table header cells inside a scrolling table container', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    elementScrolls: [{ selector: '#scroller', x: 0, y: 40 }],
    html: `
      <style>
        body { margin: 0; }
        #scroller {
          position: relative;
          left: 10px;
          top: 20px;
          width: 120px;
          height: 70px;
          overflow: auto;
        }
        table { border-spacing: 0; }
        thead { position: sticky; top: 0; }
        th, td { width: 100px; height: 30px; padding: 0; }
      </style>
      <div id="scroller">
        <table>
          <thead id="header"><tr><th id="heading">Header</th></tr></thead>
          <tbody>
            <tr><td>One</td></tr>
            <tr><td>Two</td></tr>
            <tr><td>Three</td></tr>
            <tr><td>Four</td></tr>
          </tbody>
        </table>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#header' },
      { type: 'rect', selector: '#heading' },
      { type: 'point', x: 20, y: 30 },
    ],
  })
})
