import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('place-content maps to align-content and justify-content in flex layout', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-wrap: wrap;
          width: 120px;
          height: 100px;
          place-content: center space-between;
        }

        .child {
          width: 50px;
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="first" class="child"></div>
        <div id="second" class="child"></div>
        <div id="third" class="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#third' },
    ],
  })
})

it('place-items and place-self map to grid item alignment', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          width: 120px;
          height: 80px;
          grid-template-columns: 60px 60px;
          grid-template-rows: 40px;
          place-items: center end;
        }

        .child {
          width: 20px;
          height: 10px;
        }

        #second {
          place-self: end center;
        }
      </style>
      <div id="parent">
        <div id="first" class="child"></div>
        <div id="second" class="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})
