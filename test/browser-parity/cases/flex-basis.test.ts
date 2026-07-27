import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex basis controls flex item base size', async () => {
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
          width: 20px;
          height: 20px;
          flex-basis: 60px;
          flex-shrink: 0;
        }

        #second {
          width: 30px;
          height: 10px;
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

it('percentage flex basis resolves against the container main size', async () => {
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
          width: 20px;
          height: 20px;
          flex-basis: 50%;
          flex-shrink: 0;
        }

        #second {
          width: 30px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})

it('auto flex basis uses the item main-size property', async () => {
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
          width: 70px;
          height: 20px;
          flex-basis: auto;
          flex-shrink: 0;
        }

        #second {
          width: 30px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})

it('percentage flex basis resolves against height in column layout', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-direction: column;
          width: 100px;
          height: 200px;
        }

        #first {
          width: 20px;
          height: 10px;
          flex-basis: 25%;
          flex-shrink: 0;
        }

        #second {
          width: 30px;
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})
