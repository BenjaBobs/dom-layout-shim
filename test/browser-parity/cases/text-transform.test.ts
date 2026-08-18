import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('uppercase text and letter spacing determine styled button intrinsic width', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 160 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; }
        button {
          display: inline-flex;
          box-sizing: border-box;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          padding: 6px 16px;
          border: 0;
          font-family: 'DOM Layout Shim Deterministic';
          font-size: 14px;
          font-weight: 500;
          line-height: 24.5px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      </style>
      <button id="button">Add task</button>
    `,
    queries: [
      { type: 'rect', selector: '#button' },
      { type: 'dimensions', selector: '#button' },
    ],
  })
})
