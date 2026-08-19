import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('non-rendered elements do not create layout or hit-test boxes', async () => {
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

        #script,
        #style,
        #template,
        #meta,
        #noscript,
        #link,
        #base,
        #title,
        #wbr {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }
      </style>
      <div id="target"></div>
      <script id="script" type="application/json">{"ok":true}</script>
      <style id="style">#target { background: transparent; }</style>
      <template id="template"><div></div></template>
      <meta id="meta" name="test" content="value">
      <noscript id="noscript">Fallback</noscript>
      <link id="link" rel="author" href="about:blank">
      <base id="base" href="http://localhost/">
      <title id="title">Example</title>
      <wbr id="wbr">
    `,
    queries: [
      { type: 'point', x: 50, y: 50 },
      { type: 'rect', selector: '#script' },
      { type: 'rect', selector: '#style' },
      { type: 'rect', selector: '#template' },
      { type: 'rect', selector: '#meta' },
      { type: 'rect', selector: '#noscript' },
      { type: 'rect', selector: '#link' },
      { type: 'rect', selector: '#base' },
      { type: 'rect', selector: '#title' },
      { type: 'rect', selector: '#wbr' },
    ],
  });
});
