import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('unordered lists apply native margins and inline padding for list items', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #before,
        #after {
          width: 30px;
          height: 10px;
        }

        li {
          width: 50px;
          height: 20px;
        }
      </style>
      <div id="before"></div>
      <ul id="list">
        <li id="one"></li>
        <li id="two"></li>
      </ul>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#list' },
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 45, y: 30 },
    ],
  })
})

it('definition list defaults position descriptions with native indentation', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #before,
        #after {
          width: 30px;
          height: 10px;
        }

        dt,
        dd {
          width: 50px;
          height: 20px;
        }
      </style>
      <div id="before"></div>
      <dl id="list">
        <dt id="term"></dt>
        <dd id="description"></dd>
      </dl>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#list' },
      { type: 'rect', selector: '#term' },
      { type: 'rect', selector: '#description' },
      { type: 'rect', selector: '#after' },
    ],
  })
})
