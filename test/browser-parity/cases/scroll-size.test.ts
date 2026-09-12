import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

for (const [name, style, content] of [
  ['empty padding box', 'padding:10px;border:3px solid', ''],
  [
    'overflowing child',
    'overflow:auto',
    '<div style="width:240px;height:180px"></div>',
  ],
  [
    'overflowing padded child',
    'overflow:auto;padding:10px;border:3px solid',
    '<div style="width:240px;height:180px"></div>',
  ],
  [
    'visible overflow',
    'padding:10px;border:3px solid',
    '<div style="width:240px;height:180px"></div>',
  ],
  [
    'nested clipped overflow',
    'overflow:auto',
    '<div style="width:50px;height:30px;overflow:hidden"><div style="width:240px;height:180px"></div></div>',
  ],
  [
    'nested visible overflow',
    'overflow:auto',
    '<div style="width:50px;height:30px"><div style="width:240px;height:180px"></div></div>',
  ],
  [
    'positioned overflow',
    'overflow:auto;position:relative',
    '<div style="position:absolute;left:80px;top:40px;width:160px;height:140px"></div>',
  ],
  [
    'hidden box',
    'display:none',
    '<div style="width:240px;height:180px"></div>',
  ],
  [
    'contents box',
    'display:contents',
    '<div style="width:240px;height:180px"></div>',
  ],
  [
    'fractional dimensions',
    'width:100.5px;height:60.25px;padding:2.5px;border:1px solid',
    '',
  ],
  [
    'negative overflow',
    'overflow:auto;position:relative',
    '<div style="position:absolute;left:-80px;top:-40px;width:20px;height:20px"></div>',
  ],
  [
    'fixed descendant',
    'overflow:auto',
    '<div style="position:fixed;left:0;top:0;width:240px;height:180px"></div>',
  ],
  [
    'escaped absolute descendant',
    'overflow:auto',
    '<div style="position:absolute;left:0;top:0;width:240px;height:180px"></div>',
  ],
  [
    'flex overflow',
    'display:flex;overflow:auto;padding:10px',
    '<div style="flex:none;width:240px;height:180px"></div>',
  ],
  [
    'grid overflow',
    'display:grid;grid-template-columns:240px;overflow:auto;padding:10px',
    '<div style="height:180px"></div>',
  ],
  [
    'child margins',
    'overflow:auto;padding:10px',
    '<div style="width:240px;height:180px;margin:5px"></div>',
  ],
  [
    'transformed child',
    'overflow:auto',
    '<div style="width:240px;height:180px;transform:translate(30px,20px)"></div>',
  ],
] as const) {
  it(`scroll size: ${name}`, async () => {
    await expectChromiumParity({
      viewport: { width: 500, height: 400 },
      html: `<style>body { margin:0 }</style><div id="box" style="width:100px;height:60px;${style}">${content}</div>`,
      queries: [{ type: 'scroll-size', selector: '#box' }],
    });
  });
}

it('scroll sizes remain stable after element and viewport scrolling', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    elementScrolls: [{ selector: '#box', x: 30, y: 40 }],
    scroll: { x: 0, y: 20 },
    html: '<style>body{margin:0}</style><div id="box" style="width:100px;height:60px;overflow:auto;padding:10px;border:3px solid"><div style="width:240px;height:180px"></div></div><div style="height:800px"></div>',
    queries: [
      { type: 'scroll-size', selector: '#box' },
      { type: 'scroll-size', selector: 'html' },
      { type: 'scroll-size', selector: 'body' },
    ],
  });
});

it('inline phrasing elements have no scroll box', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    html: '<span id="inline">hello</span>',
    queries: [{ type: 'scroll-size', selector: '#inline' }],
  });
});

it('scroll sizes include overflowing text and generated content', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 400 },
    typography: 'deterministic',
    html: `<style>
      body { margin:0 }
      .box { width:100px; height:20px; overflow:hidden; white-space:nowrap; padding:10px; border:2px solid }
      #generated::after { content:'abcdefghijklmno'; display:block; width:240px; height:80px }
    </style><div id="text" class="box">abcdefghijklmnopqrst</div><div id="generated" class="box"></div>`,
    queries: [
      { type: 'scroll-size', selector: '#text' },
      { type: 'scroll-size', selector: '#generated' },
    ],
  });
});
