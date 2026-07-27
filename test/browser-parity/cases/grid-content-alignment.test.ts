import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('grid content alignment positions the explicit track grid', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 260 },
    html: `
      <style>
        body {
          margin: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: 40px 40px;
          grid-template-rows: 20px 20px;
          width: 200px;
          height: 100px;
        }

        #end {
          justify-content: end;
          align-content: end;
        }

        #center {
          justify-content: center;
          align-content: center;
        }
      </style>
      <div id="end" class="grid">
        <div id="end-a"></div>
        <div id="end-b"></div>
        <div id="end-c"></div>
      </div>
      <div id="center" class="grid">
        <div id="center-a"></div>
        <div id="center-b"></div>
        <div id="center-c"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#end-a' },
      { type: 'rect', selector: '#end-b' },
      { type: 'rect', selector: '#end-c' },
      { type: 'rect', selector: '#center-a' },
      { type: 'rect', selector: '#center-b' },
      { type: 'rect', selector: '#center-c' },
    ],
  })
})

it('grid content alignment distributes space between tracks', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #grid {
          display: grid;
          grid-template-columns: 40px 40px;
          grid-template-rows: 20px 20px;
          justify-content: space-between;
          align-content: space-between;
          width: 200px;
          height: 100px;
        }
      </style>
      <div id="grid">
        <div id="first"></div>
        <div id="second"></div>
        <div id="third"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#third' },
    ],
  })
})
