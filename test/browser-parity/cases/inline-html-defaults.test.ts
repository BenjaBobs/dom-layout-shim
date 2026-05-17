import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('native inline phrasing elements contribute text without block breaks', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          width: 240px;
          font-size: 20px;
          line-height: 30px;
        }

        #after {
          width: 50px;
          height: 10px;
        }
      </style>
      <div id="host"><span>Hello</span> <strong>World</strong></div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#host' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('author display overrides native inline phrasing defaults', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #inline {
          display: block;
          width: 80px;
          height: 20px;
        }

        #after {
          width: 50px;
          height: 10px;
        }
      </style>
      <span id="inline"></span>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#inline' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('native inline phrasing elements preserve br line breaks in ancestor text measurement', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          width: 240px;
          font-size: 20px;
          line-height: 30px;
          white-space: pre-wrap;
        }

        #after {
          width: 50px;
          height: 10px;
        }
      </style>
      <div id="host"><span>Hello</span><br><strong>World</strong></div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#host' },
      { type: 'rect', selector: '#after' },
    ],
  })
})
