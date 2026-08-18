import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('matches selector lists descendant and child combinators', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #button, #panel {
          position: absolute;
          width: 50px;
          height: 30px;
        }

        .dialog .button {
          left: 40px;
        }

        #app > .panel {
          top: 60px;
        }
      </style>
      <div class="dialog">
        <button id="button" class="button"></button>
      </div>
      <div id="app">
        <div id="panel" class="panel"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#button' },
      { type: 'rect', selector: '#panel' },
    ],
  })
})

it('matches supported attribute and functional pseudo-class selectors', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        [data-state] {
          position: absolute;
          left: 10px;
          width: 50px;
          height: 50px;
        }

        :where([data-state="open"]) {
          top: 10px;
        }

        :is(.primary, [data-priority="high"]) {
          left: 30px;
        }

        button:not([hidden]) {
          top: 20px;
        }

        [data-tags~="primary"] {
          width: 70px;
        }

        [data-name^="save"] {
          height: 60px;
        }
      </style>
      <button
        id="button"
        data-state="open"
        data-priority="high"
        data-tags="primary action"
        data-name="save-button"
      ></button>
    `,
    queries: [{ type: 'rect', selector: '#button' }],
  })
})

it('does not overmatch scoped compound functional selectors', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body { margin: 0; }
        .workspace, .scope.ant-input { position: absolute; top: 0; width: 20px; height: 20px; }
        .workspace { left: 10px; }
        :where(.scope).ant-input:not(.success) { left: 100px; }
        :is(.scope, .alternate).ant-input { top: 30px; }
      </style>
      <div id="workspace" class="workspace"></div>
      <input id="input" class="scope ant-input">
    `,
    queries: [
      { type: 'rect', selector: '#workspace' },
      { type: 'rect', selector: '#input' },
    ],
  })
})

it('matches structural and control-state pseudo-class selectors', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body, ul { margin: 0; }
        ul { padding: 0; list-style: none; }
        li { width: 10px; height: 10px; }
        li:first-child { width: 20px; }
        li:nth-child(2) { width: 30px; }
        li:last-child { width: 40px; }
        button { width: 10px; height: 10px; }
        button:disabled { width: 50px; }
      </style>
      <ul>
        <li id="first"></li>
        <li id="middle"></li>
        <li id="last"></li>
      </ul>
      <button id="disabled" disabled></button>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#middle' },
      { type: 'rect', selector: '#last' },
      { type: 'rect', selector: '#disabled' },
    ],
  })
})
