export type PointQuery = {
  type: 'point'
  x: number
  y: number
}

export type CenterClickabilityQuery = {
  type: 'center-clickability'
  selector: string
}

export type RectQuery = {
  type: 'rect'
  selector: string
}

export type DimensionsQuery = {
  type: 'dimensions'
  selector: string
}

export type BrowserParityQuery = PointQuery | CenterClickabilityQuery | RectQuery | DimensionsQuery

export type BrowserParityFixture = {
  name: string
  viewport: {
    width: number
    height: number
  }
  html: string
  queries: BrowserParityQuery[]
}

export const browserParityFixtures: BrowserParityFixture[] = [
  {
    name: 'absolute-overlap',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #back {
          position: absolute;
          left: 20px;
          top: 20px;
          width: 120px;
          height: 80px;
          z-index: 1;
        }

        #front {
          position: absolute;
          left: 40px;
          top: 40px;
          width: 120px;
          height: 80px;
          z-index: 2;
        }
      </style>
      <div id="back"></div>
      <div id="front"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  },
  {
    name: 'pointer-events-none',
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

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }
      </style>
      <div id="target"></div>
      <div id="skip"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  },
  {
    name: 'display-none',
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
          display: none;
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
    queries: [
      { type: 'point', x: 50, y: 50 },
      { type: 'rect', selector: '#hidden' },
    ],
  },
  {
    name: 'hidden-attribute',
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
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }
      </style>
      <div id="target"></div>
      <div id="hidden" hidden></div>
    `,
    queries: [
      { type: 'point', x: 50, y: 50 },
      { type: 'rect', selector: '#hidden' },
    ],
  },
  {
    name: 'visibility-hidden',
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
  },
  {
    name: 'z-index-dom-order',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #first,
        #second {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }
      </style>
      <div id="first"></div>
      <div id="second"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  },
  {
    name: 'relative-offset-flow',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #one {
          position: relative;
          left: 10px;
          top: 5px;
          width: 100px;
          height: 30px;
        }

        #two {
          width: 80px;
          height: 40px;
        }
      </style>
      <div id="one"></div>
      <div id="two"></div>
    `,
    queries: [
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
      { type: 'point', x: 5, y: 5 },
      { type: 'point', x: 15, y: 10 },
    ],
  },
  {
    name: 'absolute-positioned-containing-block',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          left: 5px;
          top: 10px;
          width: 100px;
          height: 80px;
          padding: 10px;
          border-style: solid;
          border-width: 2px;
        }

        #child {
          position: absolute;
          left: 3px;
          top: 4px;
          width: 20px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 10, y: 16 },
    ],
  },
  {
    name: 'elements-from-point-order',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #bottom,
        #middle,
        #top {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #bottom {
          z-index: 1;
        }

        #middle {
          z-index: 2;
        }

        #top {
          z-index: 3;
        }
      </style>
      <div id="bottom"></div>
      <div id="top"></div>
      <div id="middle"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  },
  {
    name: 'center-click-blocked-by-overlay',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #save {
          position: absolute;
          left: 20px;
          top: 20px;
          width: 80px;
          height: 40px;
        }

        #overlay {
          position: fixed;
          inset: 0;
          z-index: 10;
        }
      </style>
      <button id="save">Save</button>
      <div id="overlay"></div>
    `,
    queries: [{ type: 'center-clickability', selector: '#save' }],
  },
  {
    name: 'right-bottom-positioning',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          right: 25px;
          bottom: 30px;
          width: 50px;
          height: 40px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'point', x: 250, y: 150 },
    ],
  },
  {
    name: 'fixed-inset-full-viewport',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #backdrop {
          position: fixed;
          inset: 0;
        }
      </style>
      <div id="backdrop"></div>
    `,
    queries: [
      { type: 'rect', selector: '#backdrop' },
      { type: 'point', x: 299, y: 199 },
    ],
  },
  {
    name: 'inset-two-value-shorthand',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #panel {
          position: fixed;
          inset: 10px 20px;
        }
      </style>
      <div id="panel"></div>
    `,
    queries: [
      { type: 'rect', selector: '#panel' },
      { type: 'point', x: 19, y: 100 },
      { type: 'point', x: 20, y: 100 },
    ],
  },
  {
    name: 'content-box-padding-border',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          padding: 5px 10px;
          border-style: solid;
          border-width: 2px 4px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'dimensions', selector: '#box' },
      { type: 'point', x: 137, y: 83 },
      { type: 'point', x: 138, y: 83 },
    ],
  },
  {
    name: 'border-box-padding-border',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          box-sizing: border-box;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          padding: 5px 10px;
          border-style: solid;
          border-width: 2px 4px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'point', x: 109, y: 69 },
      { type: 'point', x: 110, y: 69 },
    ],
  },
  {
    name: 'min-max-size-constraints',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #min {
          position: absolute;
          left: 0;
          top: 0;
          width: 50px;
          height: 20px;
          min-width: 80px;
          min-height: 40px;
        }

        #max {
          position: absolute;
          left: 100px;
          top: 0;
          width: 90px;
          height: 60px;
          max-width: 70px;
          max-height: 30px;
        }
      </style>
      <div id="min"></div>
      <div id="max"></div>
    `,
    queries: [
      { type: 'rect', selector: '#min' },
      { type: 'rect', selector: '#max' },
      { type: 'point', x: 79, y: 39 },
      { type: 'point', x: 80, y: 39 },
      { type: 'point', x: 169, y: 29 },
      { type: 'point', x: 170, y: 29 },
    ],
  },
  {
    name: 'box-sizing-min-max-size-constraints',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #content-box {
          position: absolute;
          left: 0;
          top: 0;
          width: 10px;
          height: 10px;
          min-width: 20px;
          min-height: 15px;
          padding: 5px;
          border-style: solid;
          border-width: 2px;
        }

        #border-box {
          position: absolute;
          left: 0;
          top: 40px;
          box-sizing: border-box;
          width: 100px;
          height: 60px;
          max-width: 80px;
          max-height: 30px;
          padding: 5px;
          border-style: solid;
          border-width: 2px;
        }
      </style>
      <div id="content-box"></div>
      <div id="border-box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#content-box' },
      { type: 'rect', selector: '#border-box' },
    ],
  },
  {
    name: 'border-width-none-style',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          border-style: none;
          border-width: 10px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  },
  {
    name: 'selector-specificity',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 50px;
          height: 40px;
        }

        .box {
          left: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  },
  {
    name: 'selector-source-order-tie',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        .box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 50px;
          height: 40px;
        }

        .box {
          left: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  },
  {
    name: 'static-block-flow',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #one {
          width: 100px;
          height: 30px;
        }

        #two {
          width: 80px;
          height: 40px;
        }
      </style>
      <div id="one"></div>
      <div id="two"></div>
    `,
    queries: [
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
      { type: 'point', x: 10, y: 35 },
    ],
  },
  {
    name: 'static-parent-padding-border',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 100px;
          padding: 10px;
          border-style: solid;
          border-width: 2px;
        }

        #child {
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 13, y: 13 },
    ],
  },
  {
    name: 'static-margin-flow',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 100px;
          padding: 1px;
        }

        #child {
          height: 20px;
          margin-top: 5px;
          margin-bottom: 7px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
    ],
  },
  {
    name: 'static-text-line-height',
    viewport: { width: 300, height: 200 },
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
  },
  {
    name: 'static-pre-wrap-text-lines',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 30px;
          white-space: pre-wrap;
        }
      </style>
      <div id="text">Hello
World</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  },
  {
    name: 'replaced-image-attributes',
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }
      </style>
      <img id="logo" width="24" height="16" alt="">
    `,
    queries: [{ type: 'rect', selector: '#logo' }],
  },
]
