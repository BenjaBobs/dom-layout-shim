import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('word spacing changes intrinsic widths with inheritance and CSS-wide resets', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; font-size: 20px; line-height: 24px; word-spacing: 6px; }
        #container { display: flex; flex-direction: column; align-items: flex-start; }
        .text { display: block; }
        #negative { word-spacing: -2px; }
        #relative { word-spacing: 0.5em; }
        #normal { word-spacing: normal; }
        #initial { word-spacing: initial; }
        #unset { word-spacing: unset; }
        #inherit { word-spacing: inherit; }
      </style>
      <div id="container"><div id="inherited" class="text">AA BB CC</div>
      <div id="negative" class="text">AA BB CC</div>
      <div id="relative" class="text">AA BB CC</div>
      <div id="normal" class="text">AA BB CC</div>
      <div id="initial" class="text">AA BB CC</div>
      <div id="unset" class="text">AA BB CC</div>
      <div id="inherit" class="text">AA BB CC</div>
      <div id="inline" class="text" style="word-spacing: 4px; letter-spacing: 1px">AA BB CC</div></div>
    `,
    queries: [
      'inherited',
      'negative',
      'relative',
      'normal',
      'initial',
      'unset',
      'inherit',
      'inline',
    ].map(id => ({ type: 'rect', selector: `#${id}` })),
  });
});

it('word spacing participates in wrapping after whitespace collapsing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 300 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; font-size: 20px; line-height: 24px; }
        .text { width: 55px; }
        #spaced { word-spacing: 10px; }
      </style>
      <div id="normal" class="text">AA   BB CC</div>
      <div id="spaced" class="text">AA   BB CC</div>
      <div id="after" style="height: 10px"></div>
    `,
    queries: ['normal', 'spaced', 'after'].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});

it('preformatted word spacing preserves repeated spaces and no-break spaces', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; font-size: 20px; line-height: 24px; }
        #container { display: flex; align-items: flex-start; }
        #text { white-space: pre; word-spacing: 4px; }
      </style>
      <div id="container"><div id="text">AA  BB&nbsp;CC</div></div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});
