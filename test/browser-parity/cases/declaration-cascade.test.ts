import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('resolves font-relative dimensions after the cascade regardless of declaration order', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body { margin:0 } #sheet { width:2em; font-size:30px; height:20px } #cross { width:2em; height:20px } .font { font-size:30px }</style>
      <div id="before" style="width:2em;font-size:30px;height:20px"></div>
      <div id="after" style="font-size:30px;width:2em;height:20px"></div>
      <div id="sheet"></div><div id="cross" class="font"></div>
      <div style="font-size:20px"><div id="relative" style="font-size:2em;font-size:150%;width:2em;height:20px"></div></div>`,
    queries: ['before', 'after', 'sheet', 'cross', 'relative'].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});

it('cascades importance across stylesheets, inline declarations, and custom properties', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body { margin:0 } .item { width:100px !important; --size:70px !important; height:20px } #normal { width:150px } #variable { width:var(--size) !important }</style>
      <div id="normal" class="item" style="width:200px"></div>
      <div id="important" class="item" style="width:200px !important"></div>
      <div id="variable" class="item" style="--size:200px"></div>`,
    queries: ['normal', 'important', 'variable'].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});

it('resolves generated content variables including pseudo-local custom properties', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<style>body { margin:0 } #host { --label:"a;b:c"; width:100px; font-size:16px; line-height:20px } #host::before { --copy:var(--label); content:var(--copy); display:block; height:20px } #host::after { content:""; display:block; height:10px }</style><div id="host"></div><div id="after" style="height:10px"></div>`,
    queries: [
      { type: 'rect', selector: '#host' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it.each(['inline-style', 'stylesheet'])(
  'resolves %s font sizes against inheritance rather than a portable default',
  async source => {
    const authored = source === 'inline-style' ? 'style="font-size:2em"' : '';
    await expectChromiumParity({
      viewport: { width: 400, height: 300 },
      html: `<!doctype html><style>body{margin:0}#parent{font-size:30px}#text{margin:0;width:1em;height:10px}${source === 'stylesheet' ? '#text{font-size:2em}' : ''}</style><div id="parent"><p id="text" ${authored}></p></div>`,
      queries: [{ type: 'rect', selector: '#text' }],
    });
  },
);
