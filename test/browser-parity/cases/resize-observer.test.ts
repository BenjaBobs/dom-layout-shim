import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('reports initial and resized content and border boxes through ResizeObserver', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>body { margin: 0 }</style>
      <div style="box-sizing:content-box;width:100px;height:40px;padding:10px;border:2px solid"></div>
    `,
    queries: [
      {
        type: 'resize-observer',
        selector: 'div',
        styleAfterInitial:
          'box-sizing:content-box;width:140px;height:60px;padding:10px;border:2px solid',
      },
    ],
  });
});

it.each(
  ['block', 'flex', 'grid'].flatMap(display =>
    ['border-box', 'content-box'].map(boxSizing => [display, boxSizing]),
  ),
)(
  'uses resolved percentage padding for %s %s content boxes and inline fragments',
  async (display, boxSizing) => {
    await expectChromiumParity({
      viewport: { width: 400, height: 300 },
      typography: 'deterministic',
      html: `<!doctype html><style>body{margin:0}#host{display:${display};width:200px;grid-template-columns:100px 100px}#box{box-sizing:${boxSizing};width:100px;height:80px;padding:10%;border:2px solid;font-size:20px;line-height:30px}</style><div id="host"><div id="box"><span id="text">one</span></div></div>`,
      queries: [
        { type: 'rect', selector: '#box' },
        { type: 'dimensions', selector: '#box' },
        { type: 'client-rects', selector: '#text' },
        { type: 'resize-observer', selector: '#box' },
      ],
    });
  },
);

it('re-resolves nested percentage padding when the containing block resizes', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 400 },
    typography: 'deterministic',
    html: `<!doctype html><style>body{margin:0}#host{width:200px}#outer{width:100px;padding:10%;border:2px solid}#inner{width:40px;height:20px;padding:10%;border:2px solid}</style><div id="host"><div id="outer"><div id="inner"></div></div></div><div id="after" style="height:10px"></div>`,
    queries: [
      {
        type: 'resize-observer',
        selector: '#host',
        styleAfterInitial: 'width:300px',
      },
      { type: 'resize-observer', selector: '#outer' },
      { type: 'resize-observer', selector: '#inner' },
      { type: 'rect', selector: '#after' },
      { type: 'scroll-size', selector: '#outer' },
    ],
  });
});

it('resolves generated block padding before sizing its parent and following siblings', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    typography: 'deterministic',
    html: `<!doctype html><style>body{margin:0}#host{width:200px}#host::before{content:"";display:block;width:50px;height:20px;padding:10%;border:2px solid}</style><div id="host"></div><div id="after" style="height:10px"></div>`,
    queries: [
      { type: 'resize-observer', selector: '#host' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('uses resolved insets for positioned boxes and ordinary content inside table cells', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    html: `<!doctype html><style>body{margin:0}#parent{position:relative;width:200px;height:150px;padding:20px;border:2px solid}#absolute{position:absolute;left:0;top:0;width:100px;height:20px;padding:10%;border:2px solid}table{border-spacing:0}td{width:200px;padding:0}#cell-content{width:100px;height:20px;padding:10%;border:2px solid}</style><div id="parent"><div id="absolute"></div></div><table><tbody><tr><td><div id="cell-content"></div></td></tr></tbody></table>`,
    queries: [
      { type: 'rect', selector: '#absolute' },
      { type: 'resize-observer', selector: '#absolute' },
      { type: 'rect', selector: '#cell-content' },
      { type: 'resize-observer', selector: '#cell-content' },
    ],
  });
});
