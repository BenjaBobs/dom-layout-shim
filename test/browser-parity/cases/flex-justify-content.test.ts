import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex justify content supports end and distributed spacing keywords', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        .parent {
          display: flex;
          width: 200px;
          height: 30px;
        }

        .parent > div {
          width: 20px;
          height: 10px;
        }

        #end {
          justify-content: end;
        }

        #between {
          justify-content: space-between;
        }

        #around {
          justify-content: space-around;
        }

        #evenly {
          justify-content: space-evenly;
          width: 190px;
        }
      </style>
      <div id="end" class="parent">
        <div id="end-a"></div>
        <div id="end-b"></div>
      </div>
      <div id="between" class="parent">
        <div id="between-a"></div>
        <div id="between-b"></div>
      </div>
      <div id="around" class="parent">
        <div id="around-a"></div>
        <div id="around-b"></div>
      </div>
      <div id="evenly" class="parent">
        <div id="evenly-a"></div>
        <div id="evenly-b"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#end-a' },
      { type: 'rect', selector: '#end-b' },
      { type: 'rect', selector: '#between-a' },
      { type: 'rect', selector: '#between-b' },
      { type: 'rect', selector: '#around-a' },
      { type: 'rect', selector: '#around-b' },
      { type: 'rect', selector: '#evenly-a' },
      { type: 'rect', selector: '#evenly-b' },
    ],
  })
})

it('flex justify content uses the main axis in column layout', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 50px;
          height: 100px;
        }

        #parent > div {
          width: 20px;
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
