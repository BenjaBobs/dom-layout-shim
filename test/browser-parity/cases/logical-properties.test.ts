import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('maps logical properties in default horizontal ltr writing mode', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          direction: ltr;
          writing-mode: horizontal-tb;
          position: absolute;
          inset-inline-start: 10px;
          inset-block-start: 20px;
          inline-size: 100px;
          block-size: 40px;
          padding-inline: 3px 5px;
          padding-block: 7px 9px;
          border-inline-width: 2px 4px;
          border-block-width: 1px 6px;
          border-inline-style: solid;
          border-block-style: solid;
          border-inline-color: red blue;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'dimensions', selector: '#box' },
      { type: 'point', x: 123, y: 82 },
      { type: 'point', x: 124, y: 82 },
    ],
  })
})

it('maps logical margins and padding in static block flow', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          direction: ltr;
          writing-mode: horizontal-tb;
          inline-size: 100px;
          padding-inline: 10px 12px;
          padding-block: 2px 4px;
        }

        #child {
          block-size: 20px;
          margin-inline: 3px 5px;
          margin-block: 7px 9px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
    ],
  })
})

it('maps logical min and max sizes to physical constraints', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #minimum {
          inline-size: 40px;
          block-size: 20px;
          min-inline-size: 80px;
          min-block-size: 50px;
        }

        #maximum {
          inline-size: 120px;
          block-size: 70px;
          max-inline-size: 90px;
          max-block-size: 30px;
        }
      </style>
      <div id="minimum"></div>
      <div id="maximum"></div>
    `,
    queries: [
      { type: 'rect', selector: '#minimum' },
      { type: 'rect', selector: '#maximum' },
    ],
  })
})

it('logical opposing insets resolve automatic dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          inline-size: 200px;
          block-size: 100px;
        }

        #child {
          position: absolute;
          inset-inline: 10px 20px;
          inset-block: 5px 15px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
    ],
  })
})

it('logical end insets position explicitly sized boxes', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          inline-size: 200px;
          block-size: 100px;
        }

        #child {
          position: absolute;
          inset-inline-end: 12px;
          inset-block-end: 8px;
          inline-size: 40px;
          block-size: 20px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'rect', selector: '#child' }],
  })
})
