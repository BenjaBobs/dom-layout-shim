import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('simple native tables size explicit cells with default border spacing', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        td {
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
      <table id="table">
        <tbody id="tbody">
          <tr id="row-a">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
          <tr id="row-b">
            <td id="c"></td>
            <td id="d"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
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
  })
})

it('simple native tables position multiple row groups', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        td {
          padding: 0;
        }

        #a {
          width: 50px;
          height: 20px;
        }

        #b {
          width: 60px;
          height: 10px;
        }
      </style>
      <table id="table">
        <tbody id="body-a">
          <tr id="row-a">
            <td id="a"></td>
          </tr>
        </tbody>
        <tbody id="body-b">
          <tr id="row-b">
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#body-a' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#body-b' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support direct row children', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        td {
          padding: 0;
        }

        #a {
          width: 50px;
          height: 20px;
        }

        #b {
          width: 30px;
          height: 10px;
        }
      </style>
      <table id="table">
        <tr id="row-a">
          <td id="a"></td>
        </tr>
        <tr id="row-b">
          <td id="b"></td>
        </tr>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support border spacing reset', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
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
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support separate horizontal and vertical border spacing', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 4px 6px;
        }

        td {
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
      <table id="table">
        <tbody id="tbody">
          <tr id="row-a">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
          <tr id="row-b">
            <td id="c"></td>
            <td id="d"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#c' },
      { type: 'rect', selector: '#d' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables include explicit cell padding and borders in column sizing', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 3px 5px;
          border: 2px solid black;
        }

        #a {
          width: 50px;
          height: 20px;
        }

        #b {
          width: 30px;
          height: 10px;
        }
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support collapsed borders for explicit cells', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-collapse: collapse;
        }

        td {
          border: 2px solid black;
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
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 1, y: 1 },
      { type: 'point', x: 55, y: 1 },
    ],
  })
})

it('simple native tables distribute explicit colspan widths across covered columns', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 0;
        }

        #span {
          width: 100px;
          height: 20px;
        }

        #a,
        #b {
          width: 40px;
          height: 10px;
        }
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row-a">
            <td id="span" colspan="2"></td>
          </tr>
          <tr id="row-b">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#span' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables distribute explicit rowspan heights across covered rows', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 0;
        }

        #span {
          width: 50px;
          height: 100px;
        }

        #a,
        #b {
          width: 20px;
          height: 40px;
        }
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row-a">
            <td id="span" rowspan="2"></td>
            <td id="a"></td>
          </tr>
          <tr id="row-b">
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#span' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables use explicit column widths from colgroups', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          height: 20px;
          padding: 0;
        }

        #col-a {
          width: 70px;
        }

        #col-b {
          width: 30px;
        }
      </style>
      <table id="table">
        <colgroup id="columns">
          <col id="col-a">
          <col id="col-b">
        </colgroup>
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#columns' },
      { type: 'rect', selector: '#col-a' },
      { type: 'rect', selector: '#col-b' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 5, y: 5 },
    ],
  })
})

it('simple native tables distribute explicit spanning column widths', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          height: 20px;
          padding: 0;
        }

        #col {
          width: 100px;
        }
      </style>
      <table id="table">
        <colgroup id="columns">
          <col id="col" span="2">
        </colgroup>
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#columns' },
      { type: 'rect', selector: '#col' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables scale explicit columns to author table width', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
          width: 120px;
        }

        td {
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
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables scale explicit rows to author table height', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
          height: 120px;
        }

        td {
          padding: 0;
        }

        #a {
          width: 20px;
          height: 50px;
        }

        #b {
          width: 20px;
          height: 30px;
        }
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row-a">
            <td id="a"></td>
          </tr>
          <tr id="row-b">
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support numeric width and height attributes', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 0;
        }
      </style>
      <table id="table" width="120" height="80">
        <tbody id="tbody">
          <tr id="row">
            <td id="a" width="50" height="20"></td>
            <td id="b" width="30"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support numeric column width attributes', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          height: 20px;
          padding: 0;
        }
      </style>
      <table id="table">
        <colgroup id="columns">
          <col id="col-a" width="70">
          <col id="col-b" width="30">
        </colgroup>
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#columns' },
      { type: 'rect', selector: '#col-a' },
      { type: 'rect', selector: '#col-b' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables support cellspacing and cellpadding attributes as defaults', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        td {
          width: 50px;
          height: 20px;
        }
      </style>
      <table id="table" cellspacing="4" cellpadding="3">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native table cellspacing and cellpadding attributes yield to author CSS', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          width: 50px;
          height: 20px;
          padding: 0;
        }
      </style>
      <table id="table" cellspacing="4" cellpadding="3">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables collapse table rows with visibility collapse', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 0;
        }

        #row-a {
          visibility: collapse;
        }

        #a {
          width: 50px;
          height: 20px;
        }

        #b {
          width: 30px;
          height: 10px;
        }
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row-a">
            <td id="a"></td>
          </tr>
          <tr id="row-b">
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row-a' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#row-b' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 5, y: 5 },
    ],
  })
})

it('simple native tables collapse table columns with visibility collapse', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 0;
        }

        #col-a {
          visibility: collapse;
        }

        #a {
          width: 50px;
          height: 20px;
        }

        #b {
          width: 30px;
          height: 20px;
        }
      </style>
      <table id="table">
        <colgroup id="columns">
          <col id="col-a">
          <col id="col-b">
        </colgroup>
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#columns' },
      { type: 'rect', selector: '#col-a' },
      { type: 'rect', selector: '#col-b' },
      { type: 'rect', selector: '#tbody' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 5, y: 5 },
    ],
  })
})

it('simple native tables hide empty cells from hit testing with empty-cells hide', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
          empty-cells: hide;
        }

        td {
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
      </style>
      <table id="table">
        <tbody id="tbody">
          <tr id="row">
            <td id="a"></td>
            <td id="b">x</td>
          </tr>
        </tbody>
      </table>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#a' },
      { type: 'rect', selector: '#b' },
      { type: 'point', x: 5, y: 5 },
      { type: 'point', x: 60, y: 5 },
    ],
  })
})

it('simple native tables position header and footer row groups in visual order', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        td {
          padding: 0;
        }

        #head-cell {
          width: 20px;
          height: 10px;
        }

        #body-cell {
          width: 20px;
          height: 30px;
        }

        #foot-cell {
          width: 20px;
          height: 20px;
        }
      </style>
      <table id="table">
        <tfoot id="foot">
          <tr id="foot-row">
            <td id="foot-cell"></td>
          </tr>
        </tfoot>
        <tbody id="body">
          <tr id="body-row">
            <td id="body-cell"></td>
          </tr>
        </tbody>
        <thead id="head">
          <tr id="head-row">
            <td id="head-cell"></td>
          </tr>
        </thead>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#head' },
      { type: 'rect', selector: '#head-row' },
      { type: 'rect', selector: '#head-cell' },
      { type: 'rect', selector: '#body' },
      { type: 'rect', selector: '#body-row' },
      { type: 'rect', selector: '#body-cell' },
      { type: 'rect', selector: '#foot' },
      { type: 'rect', selector: '#foot-row' },
      { type: 'rect', selector: '#foot-cell' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables position default top captions before row groups', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        caption {
          height: 12px;
          padding: 0;
        }

        td {
          padding: 0;
        }

        #cell {
          width: 50px;
          height: 20px;
        }
      </style>
      <table id="table">
        <caption id="caption"></caption>
        <tbody id="body">
          <tr id="row">
            <td id="cell"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#caption' },
      { type: 'rect', selector: '#body' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#cell' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables expand columns to wider explicit captions', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        caption {
          width: 80px;
          height: 12px;
          padding: 0;
        }

        td {
          padding: 0;
        }

        #cell {
          width: 50px;
          height: 20px;
        }
      </style>
      <table id="table">
        <caption id="caption"></caption>
        <tbody id="body">
          <tr id="row">
            <td id="cell"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#caption' },
      { type: 'rect', selector: '#body' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#cell' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('simple native tables position bottom captions after row groups', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        table {
          border-spacing: 0;
        }

        caption {
          caption-side: bottom;
          height: 12px;
          padding: 0;
        }

        td {
          padding: 0;
        }

        #cell {
          width: 50px;
          height: 20px;
        }
      </style>
      <table id="table">
        <caption id="caption"></caption>
        <tbody id="body">
          <tr id="row">
            <td id="cell"></td>
          </tr>
        </tbody>
      </table>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#table' },
      { type: 'rect', selector: '#caption' },
      { type: 'rect', selector: '#body' },
      { type: 'rect', selector: '#row' },
      { type: 'rect', selector: '#cell' },
      { type: 'rect', selector: '#after' },
    ],
  })
})
