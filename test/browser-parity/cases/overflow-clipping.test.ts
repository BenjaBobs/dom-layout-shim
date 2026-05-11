import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('overflow hidden clips descendant hit testing without changing rects', async () => {
  await expectChromiumParity({
    viewport: { width: 240, height: 160 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          left: 10px;
          top: 20px;
          width: 80px;
          height: 50px;
          overflow: hidden;
        }

        #child {
          position: absolute;
          left: 60px;
          top: 10px;
          width: 60px;
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 80, y: 40 },
      { type: 'point', x: 100, y: 40 },
    ],
  })
})

it('overflow clip clips descendant hit testing per axis', async () => {
  await expectChromiumParity({
    viewport: { width: 240, height: 160 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          left: 10px;
          top: 20px;
          width: 80px;
          height: 50px;
          overflow-x: visible;
          overflow-y: clip;
        }

        #child {
          position: absolute;
          left: 60px;
          top: 40px;
          width: 60px;
          height: 30px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'point', x: 100, y: 65 },
      { type: 'point', x: 100, y: 95 },
    ],
  })
})

it('overflow auto clips descendant hit testing without changing rects', async () => {
  await expectChromiumParity({
    viewport: { width: 240, height: 160 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          left: 10px;
          top: 20px;
          width: 80px;
          height: 50px;
          overflow: auto;
        }

        #child {
          position: absolute;
          left: 60px;
          top: 10px;
          width: 60px;
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 80, y: 40 },
      { type: 'point', x: 100, y: 40 },
    ],
  })
})

it('overflow scroll clips descendant hit testing per axis', async () => {
  await expectChromiumParity({
    viewport: { width: 240, height: 160 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          left: 10px;
          top: 20px;
          width: 80px;
          height: 50px;
          overflow-x: visible;
          overflow-y: scroll;
        }

        #child {
          position: absolute;
          left: 60px;
          top: 40px;
          width: 60px;
          height: 30px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'point', x: 100, y: 65 },
      { type: 'point', x: 100, y: 95 },
    ],
  })
})
