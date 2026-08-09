import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('resolves inherited, overridden, fallback, and cyclic custom properties across layout declarations', async () => {
  await expectChromiumParity({
    viewport: { width: 800, height: 600 },
    html: `
      <style>
        html {
          --inherited-width: 80px;
          --shared-height: 25px;
          --nested-fallback: var(--missing, var(--shared-height));
          --space: 10px;
          --gap: 7px;
          --basis: 30px;
          --columns: 25px 45px;
          --offset: 13px;
          --cycle-a: var(--cycle-b);
          --cycle-b: var(--cycle-a);
        }

        .box { position: absolute; height: var(--shared-height); }
        #inherited { top: 0; left: 0; width: var(--local-width); }
        #override { top: 0; left: 100px; width: var(--inherited-width); }
        #fallback { top: 0; left: 180px; width: var(--unknown, var(--inherited-width)); height: var(--nested-fallback); }
        #cycle { top: 0; left: 280px; width: var(--cycle-a, 55px); }
        #spacing { position: absolute; top: 50px; left: 0; width: 40px; height: 20px; margin: var(--space); padding: var(--space); }
        #gap { position: absolute; display: flex; top: 120px; left: 0; gap: var(--gap); }
        #gap > div { width: 20px; height: 10px; }
        #flex { position: absolute; display: flex; top: 120px; left: 100px; width: 100px; }
        #flex > div { flex: 0 0 var(--basis); height: 10px; }
        #grid { position: absolute; display: grid; top: 120px; left: 250px; grid-template-columns: var(--columns); }
        #grid > div { height: 10px; }
        #positioned { position: absolute; top: var(--nested-fallback); left: var(--offset); width: 20px; height: 20px; }
      </style>
      <div id="inherited-parent" style="--local-width:var(--inherited-width)"><div id="inherited" class="box"></div></div>
      <div id="override" class="box" style="--inherited-width:60px"></div>
      <div id="fallback" class="box"></div>
      <div id="cycle" class="box"></div>
      <div id="spacing"></div>
      <div id="gap"><div id="gap-first"></div><div id="gap-second"></div></div>
      <div id="flex"><div id="flex-first"></div><div id="flex-second"></div></div>
      <div id="grid"><div id="grid-first"></div><div id="grid-second"></div></div>
      <div id="positioned"></div>
    `,
    queries: [
      { type: 'rect', selector: '#inherited' },
      { type: 'rect', selector: '#override' },
      { type: 'rect', selector: '#fallback' },
      { type: 'rect', selector: '#cycle' },
      { type: 'rect', selector: '#spacing' },
      { type: 'rect', selector: '#gap-second' },
      { type: 'rect', selector: '#flex-second' },
      { type: 'rect', selector: '#grid-second' },
      { type: 'rect', selector: '#positioned' },
    ],
  })
})
