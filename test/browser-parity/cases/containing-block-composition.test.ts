import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('resolves nested calculated dimensions through definite percentage and border-box ancestors', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `<style>body{margin:0}#outer{width:400px;height:200px}#middle{box-sizing:border-box;width:50%;height:50%;padding:10px;border:5px solid}#child{width:calc(100% - 20px);height:calc(100% - 10px)}#nested{width:calc(100% - 10px);height:calc(100% - 10px)}</style><div id="outer"><div id="middle"><div id="child"><div id="nested"></div></div></div></div>`,
    queries: ['middle', 'child', 'nested'].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});

it('resolves auto inline sizes before nested calculated descendants', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<style>body{margin:0}#outer{width:300px;padding:10px}#auto{padding:10px}#child{width:calc(100% - 30px);height:20px}#nested{width:calc(100% - 20px);height:10px}</style><div id="outer"><div id="auto"><div id="child"><div id="nested"></div></div></div></div>`,
    queries: ['auto', 'child', 'nested'].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});

it('positions and sizes absolute descendants against their containing block across static ancestors', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `<style>body{margin:0}#outer{position:relative;width:200px;height:100px;padding:10px;border:5px solid}#static{width:50px;height:40px;margin:20px}#child{position:absolute;left:10%;top:10%;width:calc(100% - 20px);height:calc(100% - 10px)}</style><div id="outer"><div id="static"><div id="child"></div></div></div>`,
    queries: [
      { type: 'rect', selector: '#child' },
      { type: 'dimensions', selector: '#child' },
    ],
  });
});

it('does not make auto height definite from observed content or relative insets', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `<!doctype html><style>body{margin:0}#parent{position:relative;top:10px;bottom:10px;width:200px}#child{height:calc(50% + 10px)}#content{height:40px}</style><div id="parent"><div id="child"><div id="content"></div></div></div>`,
    queries: ['parent', 'child', 'content'].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});
