import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('static block margins affect parent and child flow geometry', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 100px;
          padding: 1px;
        }

        #child {
          height: 20px;
          margin-top: 5px;
          margin-bottom: 7px;
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

it('auto inline margins center fixed-width block children', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 200px;
        }

        #child {
          width: 80px;
          height: 20px;
          margin-inline: auto;
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

it('percentage margins resolve against containing block width', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 200px;
        }

        #child {
          width: 80px;
          height: 20px;
          margin-left: 10%;
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
