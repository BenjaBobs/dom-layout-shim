import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex grow distributes remaining space', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 200px;
        }

        #first {
          width: 40px;
          height: 20px;
          flex-grow: 1;
        }

        #second {
          width: 40px;
          height: 10px;
          flex-grow: 3;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})

it('flex grow redistributes space after an item reaches its maximum size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 200px;
        }

        #limited,
        #remaining {
          width: 40px;
          height: 20px;
          flex-grow: 1;
        }

        #limited {
          max-width: 60px;
        }
      </style>
      <div id="parent">
        <div id="limited"></div>
        <div id="remaining"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#limited' },
      { type: 'rect', selector: '#remaining' },
    ],
  })
})
