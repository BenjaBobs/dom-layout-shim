import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('pointer-events none skips the overlay target', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }
      </style>
      <div id="target"></div>
      <div id="skip"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})

it('pointer-events none is inherited by descendants for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }

        #child {
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="skip">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})

it('pointer-events inherit preserves a skipped ancestor for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }

        #child {
          pointer-events: inherit;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="skip">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})

it('pointer-events auto descendants override inherited none for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }

        #child {
          pointer-events: auto;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="skip">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})

it('pointer-events initial descendants override inherited none for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }

        #child {
          pointer-events: initial;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="skip">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})

it('pointer-events unset preserves inherited none for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }

        #child {
          pointer-events: unset;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="skip">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})
