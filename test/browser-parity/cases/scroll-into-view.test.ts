import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('scrolls nested containers and the viewport to reveal an element', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #scroller {
          margin-top: 240px;
          width: 120px;
          height: 80px;
          overflow: auto;
        }

        #spacer {
          width: 300px;
          height: 160px;
        }

        #target {
          width: 30px;
          height: 20px;
        }
      </style>
      <div id="scroller">
        <div id="spacer"></div>
        <div id="target"></div>
      </div>
    `,
    scrollIntoView: {
      selector: '#target',
      arg: { block: 'start', inline: 'nearest' },
    },
    queries: [
      { type: 'rect', selector: '#target' },
      { type: 'scroll', selector: '#scroller' },
      { type: 'scroll' },
    ],
  });
});

it('supports boolean end alignment and leaves visible inline content unchanged', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #spacer {
          height: 260px;
        }

        #target {
          margin-left: 20px;
          width: 40px;
          height: 20px;
        }
      </style>
      <div id="spacer"></div>
      <div id="target"></div>
    `,
    scrollIntoView: {
      selector: '#target',
      arg: false,
    },
    queries: [{ type: 'rect', selector: '#target' }, { type: 'scroll' }],
  });
});

it('supports center alignment in the configured viewport', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #before {
          height: 100px;
        }

        #target {
          width: 40px;
          height: 20px;
        }

        #after {
          height: 300px;
        }
      </style>
      <div id="before"></div>
      <div id="target"></div>
      <div id="after"></div>
    `,
    scrollIntoView: {
      selector: '#target',
      arg: { block: 'center' },
    },
    queries: [{ type: 'rect', selector: '#target' }, { type: 'scroll' }],
  });
});
