import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('image width and height attributes provide replaced element dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        img {
          display: block;
        }
      </style>
      <img id="logo" width="24" height="16" alt="">
      <img id="width-only" width="40" alt="">
      <img id="height-only" height="20" alt="">
    `,
    queries: [
      { type: 'rect', selector: '#logo' },
      { type: 'rect', selector: '#width-only' },
      { type: 'rect', selector: '#height-only' },
    ],
  });
});

it('frame and object elements expose native replaced dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 700, height: 600 },
    html: `
      <style>
        body {
          margin: 0;
        }

        iframe,
        object {
          display: block;
        }
      </style>
      <iframe id="iframe"></iframe>
      <iframe id="iframe-sized" width="120" height="80"></iframe>
      <object id="object"></object>
      <object id="object-sized" width="130" height="70"></object>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#iframe' },
      { type: 'dimensions', selector: '#iframe' },
      { type: 'rect', selector: '#iframe-sized' },
      { type: 'dimensions', selector: '#iframe-sized' },
      { type: 'rect', selector: '#object' },
      { type: 'dimensions', selector: '#object' },
      { type: 'rect', selector: '#object-sized' },
      { type: 'dimensions', selector: '#object-sized' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('object elements without resource hints lay out fallback content', async () => {
  await expectChromiumParity({
    viewport: { width: 700, height: 400 },
    html: `
      <style>
        body {
          margin: 0;
        }

        object {
          display: block;
        }

        .child {
          height: 20px;
        }
      </style>
      <object id="fallback">
        <div id="fallback-child" class="child"></div>
      </object>
      <object id="fallback-sized" width="120" height="80">
        <div id="fallback-sized-child" class="child"></div>
      </object>
      <object id="typed" type="image/png" width="120" height="80">
        <div id="typed-child" class="child"></div>
      </object>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#fallback' },
      { type: 'rect', selector: '#fallback-child' },
      { type: 'rect', selector: '#fallback-sized' },
      { type: 'rect', selector: '#fallback-sized-child' },
      { type: 'rect', selector: '#typed' },
      { type: 'rect', selector: '#typed-child' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('svg canvas and video elements expose native fallback dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 700, height: 600 },
    html: `
      <style>
        body {
          margin: 0;
        }

        svg,
        canvas,
        video {
          display: block;
        }
      </style>
      <svg id="svg"></svg>
      <canvas id="canvas"></canvas>
      <video id="video"></video>
      <video id="video-sized" width="160" height="90"></video>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#svg' },
      { type: 'rect', selector: '#canvas' },
      { type: 'dimensions', selector: '#canvas' },
      { type: 'rect', selector: '#video' },
      { type: 'dimensions', selector: '#video' },
      { type: 'rect', selector: '#video-sized' },
      { type: 'dimensions', selector: '#video-sized' },
      { type: 'rect', selector: '#after' },
    ],
  });
});

it('audio elements expose native control dimensions only when controls are present', async () => {
  await expectChromiumParity({
    viewport: { width: 700, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        audio {
          display: block;
        }

        #audio-sized {
          width: 400px;
          height: 40px;
        }
      </style>
      <audio id="audio"></audio>
      <audio id="audio-controls" controls></audio>
      <audio id="audio-sized" controls></audio>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      { type: 'rect', selector: '#audio' },
      { type: 'dimensions', selector: '#audio' },
      { type: 'rect', selector: '#audio-controls' },
      { type: 'dimensions', selector: '#audio-controls' },
      { type: 'rect', selector: '#audio-sized' },
      { type: 'dimensions', selector: '#audio-sized' },
      { type: 'rect', selector: '#after' },
    ],
  });
});
