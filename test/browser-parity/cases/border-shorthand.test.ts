import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('applies border shorthands to layout geometry', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        #stylesheet {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          border: 2px solid red;
        }

        #edge {
          position: absolute;
          left: 10px;
          top: 100px;
          width: 100px;
          height: 50px;
          border: solid currentColor;
          border-left: 5px solid #00f;
        }

        #line-styles {
          position: absolute;
          left: 150px;
          top: 100px;
          width: 100px;
          height: 50px;
          border-top: 2px dashed red;
          border-right: 4px dotted blue;
          border-bottom: 6px double green;
          border-left: 8px groove currentColor;
        }

        #hidden {
          position: absolute;
          left: 10px;
          top: 170px;
          width: 100px;
          height: 20px;
          border: 10px hidden red;
        }
      </style>
      <div id="stylesheet"></div>
      <div id="inline" style="position:absolute; left:150px; top:20px; width:100px; height:50px; border:4px solid black"></div>
      <div id="edge"></div>
      <div id="line-styles"></div>
      <div id="hidden"></div>
    `,
    queries: [
      { type: 'rect', selector: '#stylesheet' },
      { type: 'dimensions', selector: '#stylesheet' },
      { type: 'rect', selector: '#inline' },
      { type: 'dimensions', selector: '#inline' },
      { type: 'rect', selector: '#edge' },
      { type: 'dimensions', selector: '#edge' },
      { type: 'rect', selector: '#line-styles' },
      { type: 'dimensions', selector: '#line-styles' },
      { type: 'rect', selector: '#hidden' },
      { type: 'dimensions', selector: '#hidden' },
    ],
  });
});
