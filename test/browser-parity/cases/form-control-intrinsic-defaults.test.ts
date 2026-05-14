import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('common form controls expose native intrinsic sizes in block flow', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        button,
        input,
        textarea,
        select {
          display: block;
        }
      </style>
      <button id="button">Save</button>
      <input id="text">
      <input id="checkbox" type="checkbox">
      <input id="radio" type="radio">
      <input id="range" type="range">
      <textarea id="textarea"></textarea>
      <select id="select"><option>One</option></select>
    `,
    queries: [
      { type: 'rect', selector: '#button' },
      { type: 'rect', selector: '#text' },
      { type: 'rect', selector: '#checkbox' },
      { type: 'rect', selector: '#radio' },
      { type: 'rect', selector: '#range' },
      { type: 'rect', selector: '#textarea' },
      { type: 'rect', selector: '#select' },
      { type: 'point', x: 5, y: 5 },
    ],
  })
})

it('author width and height override form control intrinsic sizes', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        input {
          display: block;
          width: 80px;
          height: 30px;
        }
      </style>
      <input id="text">
    `,
    queries: [
      { type: 'rect', selector: '#text' },
      { type: 'dimensions', selector: '#text' },
    ],
  })
})
