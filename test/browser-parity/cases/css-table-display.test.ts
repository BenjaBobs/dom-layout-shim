import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('authored CSS table display lays out explicit row and cell boxes', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #table {
          display: table;
          border-spacing: 0;
        }

        #row-a,
        #row-b {
          display: table-row;
        }

        .cell {
          display: table-cell;
          padding: 0;
        }

        #a {
          width: 50px;
          height: 20px;
        }

        #b {
          width: 30px;
          height: 20px;
        }

        #c {
          width: 40px;
          height: 10px;
        }

        #d {
          width: 60px;
          height: 10px;
        }
      </style>
      <div id="table">
        <div id="row-a">
          <div id="a" class="cell"></div>
          <div id="b" class="cell"></div>
        </div>
        <div id="row-b">
          <div id="c" class="cell"></div>
          <div id="d" class="cell"></div>
        </div>
      </div>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#c' },
      { type: 'rect', selector: '#d' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 5, y: 5 },
      { type: 'point', x: 55, y: 5 },
    ],
  });
});

it('authored CSS table display supports row groups and captions', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #table {
          display: table;
          border-spacing: 0;
          caption-side: bottom;
        }

        #caption {
          display: table-caption;
          width: 90px;
          height: 12px;
        }

        #group {
          display: table-row-group;
        }

        #row {
          display: table-row;
        }

        #cell {
          display: table-cell;
          width: 50px;
          height: 20px;
          padding: 0;
        }
      </style>
      <div id="table">
        <div id="caption"></div>
        <div id="group">
          <div id="row">
            <div id="cell"></div>
          </div>
        </div>
      </div>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#caption' },
      { type: 'rect', selector: '#group' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#cell' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('table-layout and vertical-align are accepted for explicit table geometry', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #table {
          display: table;
          table-layout: fixed;
          width: 100px;
          border-spacing: 0;
        }

        #row {
          display: table-row;
        }

        #a,
        #b {
          display: table-cell;
          padding: 0;
          vertical-align: bottom;
          height: 20px;
        }
      </style>
      <div id="table">
        <div id="row">
          <div id="a"></div>
          <div id="b"></div>
        </div>
      </div>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  });
});
