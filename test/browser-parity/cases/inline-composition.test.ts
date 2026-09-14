import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('keeps inline offset dimensions, client dimensions, and paint ordering consistent with fragments', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<style>body{margin:0}#host{width:100px;font-size:20px;line-height:30px}#overlay{position:absolute;left:0;top:0;width:100px;height:30px}</style><div id="host">one <span id="text">two three four five</span></div><div id="overlay"></div>`,
    queries: [
      { type: 'rect', selector: '#text' },
      { type: 'dimensions', selector: '#text' },
      { type: 'scroll-size', selector: '#text' },
      { type: 'point', x: 45, y: 10 },
    ],
  });
});

it('lays out bare text and styled inline runs after block children', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<style>body { margin:0 } .host { width:100px;line-height:20px;font-size:16px } #large { font-size:20px;line-height:30px }</style><div id="bare" class="host"><div style="height:30px"></div>Hello</div><div id="styled" class="host"><div style="height:30px"></div><span id="large">one two three four</span></div>`,
    queries: [
      { type: 'rect', selector: '#bare' },
      { type: 'rect', selector: '#styled' },
      { type: 'client-rects', selector: '#large' },
      { type: 'point', x: 10, y: 90 },
    ],
  });
});

it('uses styled fragments for nested inline geometry and point queries', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<style>body { margin:0 } #host { width:160px;font-size:20px;line-height:30px } #inner { font-size:10px;line-height:20px }</style><div id="host"><span id="outer">one <span id="inner">two</span> three four</span></div>`,
    queries: [
      { type: 'rect', selector: '#host' },
      { type: 'client-rects', selector: '#outer' },
      { type: 'client-rects', selector: '#inner' },
      { type: 'point', x: 45, y: 16 },
    ],
  });
});

it('retains pseudo typography in inline and block generated content', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<style>body { margin:0 } .host { width:100px;font-size:10px;line-height:20px } .host::before { content:"one two three";font-size:20px;line-height:30px } #block::before { display:block }</style><div id="inline" class="host"></div><div id="block" class="host"></div>`,
    queries: [
      { type: 'rect', selector: '#inline' },
      { type: 'rect', selector: '#block' },
    ],
  });
});

it.each(['pre-wrap', 'pre-line'] as const)(
  'wraps %s consistently with inline fragments',
  async whiteSpace => {
    await expectChromiumParity({
      viewport: { width: 400, height: 300 },
      typography: 'deterministic',
      html: `<style>body{margin:0}#host{width:80px;font-size:20px;line-height:30px;white-space:${whiteSpace}}</style><div id="host"><span id="text">one two three\nfour five</span></div>`,
      queries: [
        { type: 'rect', selector: '#host' },
        { type: 'client-rects', selector: '#text' },
      ],
    });
  },
);

it.each(['inline-style', 'stylesheet'])(
  'uses the same inline formatting for native spans and %s display declarations',
  async source => {
    const declaration =
      source === 'inline-style' ? 'style="display:inline"' : 'class="inline"';
    await expectChromiumParity({
      viewport: { width: 400, height: 300 },
      typography: 'deterministic',
      html: `<!doctype html><style>body{margin:0}.host{width:100px;font-size:20px;line-height:30px}.inline{display:inline}</style><div class="host"><span id="native">one two three four</span></div><div class="host"><div id="authored" ${declaration}>one two three four</div></div>`,
      queries: [
        { type: 'client-rects', selector: '#native' },
        { type: 'client-rects', selector: '#authored' },
        { type: 'dimensions', selector: '#authored' },
        { type: 'scroll-size', selector: '#authored' },
        { type: 'point', x: 10, y: 100 },
      ],
    });
  },
);

it('blockifies inline elements and generated boxes in flex formatting contexts', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<!doctype html><style>body{margin:0}#host{display:flex;width:200px}#host::before{content:"before";display:inline;width:40px;height:30px}#contents{display:contents}#item{display:inline;width:60px;height:40px}</style><div id="host"><div id="contents"><span id="item">item</span></div></div>`,
    queries: [
      { type: 'rect', selector: '#host' },
      { type: 'dimensions', selector: '#item' },
      { type: 'rect', selector: '#item' },
      { type: 'point', x: 50, y: 10 },
    ],
  });
});
