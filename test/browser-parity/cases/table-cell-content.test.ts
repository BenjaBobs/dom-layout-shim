import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('lays out nested block, flex, and grid content inside table cells', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `<style>body{margin:0}table{border-spacing:0}td{padding:0;vertical-align:top}.child{width:100px;height:40px}#flex{display:flex;gap:10px}#grid{display:grid;grid-template-columns:40px 60px}.item{height:20px;flex:1}</style><table id="table"><tbody><tr><td id="cell"><div id="block" class="child"></div></td><td><div id="flex" class="child"><div id="flex-child" class="item"></div><div class="item"></div></div></td><td><div id="grid" class="child"><div class="item"></div><div id="grid-child" class="item"></div></div></td></tr></tbody></table>`,
    queries: [
      ...['table', 'cell', 'block', 'flex', 'flex-child', 'grid-child'].map(
        id => ({ type: 'rect' as const, selector: `#${id}` }),
      ),
      { type: 'point', x: 110, y: 10 },
    ],
  });
});

it('reflows styled inline content within explicitly allocated cell widths', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<style>body{margin:0}table{border-spacing:0}td{padding:0;width:100px;vertical-align:top;font-size:20px;line-height:30px}</style><table id="table"><tbody><tr><td id="cell"><span id="text">one two three four five</span></td></tr></tbody></table>`,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#cell' },
      { type: 'client-rects', selector: '#text' },
      { type: 'point', x: 5, y: 10 },
    ],
  });
});

it('aligns ordinary block descendants within taller cells', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body{margin:0}table{border-spacing:0}td{padding:4px;width:100px;height:80px}#bottom{vertical-align:bottom}.child{width:20px;height:20px}</style><table><tbody><tr><td><div id="middle-child" class="child"></div></td><td id="bottom"><div id="bottom-child" class="child"></div></td></tr></tbody></table>`,
    queries: [
      { type: 'rect', selector: '#middle-child' },
      { type: 'rect', selector: '#bottom-child' },
    ],
  });
});

it('uses computed inheritance for caption placement and empty-cell hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<!doctype html><style>body{margin:0}table{border-spacing:0;caption-side:bottom}caption{caption-side:top;height:10px}td{width:50px;height:20px;padding:0}tbody{empty-cells:hide}#shown{empty-cells:show}</style><table id="table"><caption id="caption"></caption><tbody><tr><td id="hidden"></td><td id="shown"></td></tr></tbody></table>`,
    queries: [
      { type: 'rect', selector: '#caption' },
      { type: 'rect', selector: '#hidden' },
      { type: 'point', x: 10, y: 15 },
      { type: 'point', x: 60, y: 15 },
    ],
  });
});
