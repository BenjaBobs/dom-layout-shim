import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex shrink distributes negative free space by scaled shrink factors', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 150px;
        }

        #first {
          width: 100px;
          height: 20px;
          flex-shrink: 1;
        }

        #second {
          width: 100px;
          height: 10px;
          flex-shrink: 3;
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

it('flex shrink zero preserves an inflexible item while siblings shrink', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 150px;
        }

        #fixed {
          width: 100px;
          height: 20px;
          flex-shrink: 0;
        }

        #shrinking {
          width: 100px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="fixed"></div>
        <div id="shrinking"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#fixed' },
      { type: 'rect', selector: '#shrinking' },
    ],
  })
})

it('flex shrink freezes an item at its minimum main size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 150px;
        }

        #limited {
          width: 100px;
          min-width: 80px;
          height: 20px;
        }

        #remaining {
          width: 100px;
          height: 10px;
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
