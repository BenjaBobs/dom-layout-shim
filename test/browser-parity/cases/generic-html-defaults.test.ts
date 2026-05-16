import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('text block elements apply native margins and font metrics inside padded parents', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          padding: 1px;
        }

        p,
        blockquote,
        pre,
        address {
          width: 100px;
        }
      </style>
      <div id="host">
        <p id="paragraph">Hello</p>
        <blockquote id="quote">Hello</blockquote>
        <pre id="pre">Hello</pre>
        <address id="address">Hello</address>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#paragraph' },
      { type: 'rect', selector: '#quote' },
      { type: 'rect', selector: '#pre' },
      { type: 'rect', selector: '#address' },
    ],
  })
})

it('author CSS can reset generic text element defaults', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        p {
          margin: 0;
          width: 100px;
          font-size: 20px;
          line-height: 30px;
        }
      </style>
      <p id="paragraph">Hello</p>
    `,
    queries: [{ type: 'rect', selector: '#paragraph' }],
  })
})
