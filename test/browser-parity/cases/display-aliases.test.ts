import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('blockifies common display aliases for positioned elements', async () => {
  await expectChromiumParity({
    viewport: { width: 360, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        .box {
          position: absolute;
          width: 40px;
          height: 20px;
        }

        #inline {
          display: inline;
          left: 10px;
          top: 10px;
        }

        #inline-block {
          display: inline-block;
          left: 60px;
          top: 10px;
        }

        #flow-root {
          display: flow-root;
          left: 110px;
          top: 10px;
        }

        #list-item {
          display: list-item;
          left: 160px;
          top: 10px;
        }
      </style>
      <div id="inline" class="box"></div>
      <div id="inline-block" class="box"></div>
      <div id="flow-root" class="box"></div>
      <div id="list-item" class="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#inline' },
      { type: 'rect', selector: '#inline-block' },
      { type: 'rect', selector: '#flow-root' },
      { type: 'rect', selector: '#list-item' },
      { type: 'point', x: 20, y: 20 },
      { type: 'point', x: 70, y: 20 },
      { type: 'point', x: 120, y: 20 },
      { type: 'point', x: 170, y: 20 },
    ],
  });
});

it('maps inline flex and grid aliases to their layout modes', async () => {
  await expectChromiumParity({
    viewport: { width: 360, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        .container {
          position: absolute;
          width: 100px;
          height: 40px;
        }

        #flex {
          display: inline-flex;
          left: 10px;
          top: 10px;
          gap: 5px;
        }

        #grid {
          display: inline-grid;
          left: 10px;
          top: 70px;
          grid-template-columns: 30px 40px;
        }

        .child {
          width: 30px;
          height: 20px;
        }
      </style>
      <div id="flex" class="container">
        <div id="flex-a" class="child"></div>
        <div id="flex-b" class="child"></div>
      </div>
      <div id="grid" class="container">
        <div id="grid-a" class="child"></div>
        <div id="grid-b" class="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#flex-a' },
      { type: 'rect', selector: '#flex-b' },
      { type: 'rect', selector: '#grid-a' },
      { type: 'rect', selector: '#grid-b' },
    ],
  });
});

it('flow-root establishes an independent block formatting context', async () => {
  await expectChromiumParity({
    viewport: { width: 360, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #flow-root {
          display: flow-root;
          width: 100px;
        }

        #child {
          height: 20px;
          margin-top: 30px;
        }

        #after {
          height: 10px;
        }
      </style>
      <div id="flow-root"><div id="child"></div></div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#flow-root' },
      { type: 'rect', selector: '#child' },
      { type: 'rect', selector: '#after' },
    ],
  });
});
