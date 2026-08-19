import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('static text line height determines block height', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 30px;
        }
      </style>
      <div id="text">Hello</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('percentage line height resolves against font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 150%;
        }
      </style>
      <div id="text">Hello</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('em line height resolves against font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 1.5em;
        }
      </style>
      <div id="text">Hello</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('rem line height resolves against the root font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        html {
          font-size: 20px;
        }

        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 10px;
          line-height: 1.5rem;
        }
      </style>
      <div id="text">Hello</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('nested text inherits parent font metrics', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          font-size: 20px;
          line-height: 30px;
        }

        #text {
          width: 100px;
        }
      </style>
      <div id="host">
        <div id="text">Hello</div>
      </div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('font weight and letter spacing inherit into intrinsic text measurement', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body { margin: 0; }
        #host { font-size: 20px; font-weight: 700; letter-spacing: 2px; }
        #text { position: absolute; line-height: 30px; }
      </style>
      <div id="host"><div id="text">Hello</div></div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('percentage font size resolves against inherited parent font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          font-size: 20px;
        }

        #text {
          width: 125px;
          font-size: 150%;
          line-height: 40px;
        }
      </style>
      <div id="host">
        <div id="text">Hello World</div>
      </div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('em font size resolves against inherited parent font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          font-size: 20px;
        }

        #text {
          width: 125px;
          font-size: 1.5em;
          line-height: 40px;
        }
      </style>
      <div id="host">
        <div id="text">Hello World</div>
      </div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('rem font size resolves against the root font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        html {
          font-size: 20px;
        }

        body {
          margin: 0;
        }

        #host {
          font-size: 10px;
        }

        #text {
          width: 125px;
          font-size: 1.5rem;
          line-height: 40px;
        }
      </style>
      <div id="host">
        <div id="text">Hello World</div>
      </div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('inherited text declarations preserve parent text metrics', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          font-family: Arial;
          font-size: 20px;
          line-height: 30px;
          white-space: pre-wrap;
        }

        #text {
          width: 100px;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          white-space: inherit;
        }
      </style>
      <div id="host"><div id="text">Hello
World</div></div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('font-size initial resets inherited parent font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          font-size: 20px;
        }

        #text {
          width: 200px;
          font-size: initial;
          line-height: 1em;
        }
      </style>
      <div id="host"><div id="text">Hello</div></div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('font-size unset preserves inherited parent font size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          font-size: 20px;
        }

        #text {
          width: 200px;
          font-size: unset;
          line-height: 1em;
        }
      </style>
      <div id="host"><div id="text">Hello</div></div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});

it('white-space initial resets inherited pre-wrap behavior', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    typography: 'deterministic',
    html: `
      <style>
        body {
          margin: 0;
        }

        #host {
          white-space: pre-wrap;
        }

        #text {
          width: 200px;
          font-size: 20px;
          line-height: 30px;
          white-space: initial;
        }
      </style>
      <div id="host"><div id="text">Hello
World</div></div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  });
});
