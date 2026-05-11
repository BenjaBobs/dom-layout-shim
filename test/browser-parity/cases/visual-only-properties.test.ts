import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('visual-only properties do not change layout or pointer targeting', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          opacity: 0;
          color: #fff;
          background: rgb(0, 0, 255);
          background-image: none;
          background-repeat: no-repeat;
          background-position: center top;
          background-size: cover;
          background-origin: content-box;
          background-clip: padding-box;
          background-attachment: fixed;
          border: 2px solid;
          border-color: red green blue black;
          border-radius: 20px 8px / 10px 4px;
          box-shadow: 0 0 12px 8px rgba(0,0,0,.5);
          filter: blur(2px);
          outline: 4px dashed currentColor;
          outline-offset: 3px;
          text-decoration: underline wavy red 2px;
          transform: none;
          transform-origin: center top;
          will-change: transform, opacity;
          appearance: none;
          accent-color: red;
          caret-color: #333;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: red blue;
          overscroll-behavior: contain;
          isolation: isolate;
          mix-blend-mode: multiply;
          list-style: none;
          forced-color-adjust: none;
          color-scheme: dark light;
        }

        #image {
          position: absolute;
          left: 140px;
          top: 20px;
          width: 80px;
          height: 40px;
          object-fit: cover;
          object-position: center top;
          cursor: pointer;
          user-select: none;
          touch-action: none;
          resize: none;
        }
      </style>
      <div id="box"></div>
      <img id="image" width="20" height="20" alt="">
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'point', x: 20, y: 30 },
      { type: 'point', x: 8, y: 30 },
      { type: 'rect', selector: '#image' },
      { type: 'point', x: 150, y: 30 },
    ],
  })
})
