import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('visibility hidden removes the element from hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          visibility: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }
      </style>
      <div id="target"></div>
      <div id="hidden"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('visibility collapse removes regular elements from hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #collapsed {
          visibility: collapse;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }
      </style>
      <div id="target"></div>
      <div id="collapsed"></div>
    `,
    queries: [
      { type: 'rect', selector: '#collapsed' },
      { type: 'point', x: 50, y: 50 },
    ],
  });
});

it('visibility hidden is inherited by descendants for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          visibility: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }

        #child {
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="hidden">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('visibility inherit preserves a hidden ancestor for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          visibility: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }

        #child {
          visibility: inherit;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="hidden">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('visibility visible descendants override a hidden ancestor for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          visibility: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }

        #child {
          visibility: visible;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="hidden">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('visibility initial descendants override a hidden ancestor for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          visibility: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }

        #child {
          visibility: initial;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="hidden">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});

it('visibility unset preserves a hidden ancestor for hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          visibility: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }

        #child {
          visibility: unset;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="target"></div>
      <div id="hidden">
        <div id="child"></div>
      </div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  });
});
