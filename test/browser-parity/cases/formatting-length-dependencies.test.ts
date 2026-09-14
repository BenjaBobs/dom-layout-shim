import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('resolves generated box calculations against their originating content box', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body{margin:0}#host{padding:20px;height:120px;overflow:auto}#host::before{content:"";display:block;width:calc(100% + 30px);height:calc(50% + 10px)}#child{height:10px}</style><div id="host"><div id="child"></div></div>`,
    queries: [
      { type: 'rect', selector: '#child' },
      { type: 'dimensions', selector: '#host' },
    ],
  });
});

it('resolves generated flex item calculations after the host gets its auto width', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body{margin:0}#host{display:flex;padding:20px}#host::before{content:"";width:calc(50% - 10px);height:20px;flex:none}#child{width:30px;height:20px;flex:none}</style><div id="host"><div id="child"></div></div>`,
    queries: [
      { type: 'rect', selector: '#child' },
      { type: 'rect', selector: '#host' },
    ],
  });
});

it.each([
  ['inline', 'generated'],
  ['rule', 'generated'],
  ['inline', 'element'],
  ['rule', 'element'],
] as const)(
  'reflows table rows after allocated cell calculations from %s declarations with a %s child',
  async (source, childKind) => {
    const declarations =
      'width:calc(100% - 20px);aspect-ratio:2;margin-top:calc(10% + 2px)';
    await expectChromiumParity({
      viewport: { width: 400, height: 300 },
      html: `<style>body{margin:0}table{width:200px;border-spacing:0}td{padding:0}#nested{width:calc(100% - 10px);height:20px}${childKind === 'generated' ? '#child::before' : '#before'}{content:"";display:block;height:calc(10% + 3px)}${source === 'rule' ? `#child{${declarations}}` : ''}</style><table id="table"><tbody><tr id="row"><td id="cell"><div id="child" ${source === 'inline' ? `style="${declarations}"` : ''}>${childKind === 'element' ? '<div id="before"></div>' : ''}<div id="nested"></div></div></td></tr></tbody></table><div id="after" style="height:10px"></div>`,
      queries: ['table', 'row', 'cell', 'child', 'nested', 'after'].map(id => ({
        type: 'rect',
        selector: `#${id}`,
      })),
    });
  },
);
