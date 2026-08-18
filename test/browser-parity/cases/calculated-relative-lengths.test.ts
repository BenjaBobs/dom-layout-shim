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
