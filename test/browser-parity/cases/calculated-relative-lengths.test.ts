import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('resolves calculated viewport and font-relative lengths in layout properties', async () => {
  await expectChromiumParity({
    viewport: { width: 800, height: 600 },
    typography: 'deterministic',
    html: `
      <style>
        html { font-size: 10px; --base: 40px; }
        .subject { position: absolute; left: 0; }
        #viewport { top: 0; width: calc(50vw - 20px); height: 25vh; }
        #font { top: 160px; font-size: 12px; width: 10em; height: 3rem; }
        #variable { top: 200px; width: calc(var(--base) * 2 + 5px); height: 20px; }
        #text { top: 230px; font-size: calc(1rem + 4px); line-height: calc(1.5 * 14px); }
      </style>
      <div id="viewport" class="subject"></div>
      <div id="font" class="subject"></div>
      <div id="variable" class="subject"></div>
      <div id="text" class="subject">text</div>
    `,
    queries: [
      { type: 'rect', selector: '#viewport' },
      { type: 'rect', selector: '#font' },
      { type: 'rect', selector: '#variable' },
      { type: 'rect', selector: '#text' },
    ],
  })
})

it('resolves mixed percentage and pixel calculations against a definite containing block', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body { margin: 0; }
        #parent { position: relative; width: 200px; height: 120px; }
        #size {
          position: absolute;
          width: calc(100% - 32px);
          height: calc(50% + 10px);
        }
        #constraint {
          width: 300px;
          height: 200px;
          max-width: calc(100% - 24px);
          max-height: calc(100% - 20px);
        }
      </style>
      <div id="parent">
        <div id="size"></div>
        <div id="constraint"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#size' },
      { type: 'rect', selector: '#constraint' },
    ],
  })
})
