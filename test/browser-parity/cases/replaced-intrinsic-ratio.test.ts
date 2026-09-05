import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

it('SVG viewBox supplies the automatic dimension in block, flex, and grid layout', async () => {
  await expectChromiumParity({
    viewport: { width: 600, height: 700 },
    html: `
      <style>
        body { margin: 0; }
        svg { display: block; }
        #flex { display: flex; width: 240px; align-items: flex-start; }
        #grid { display: grid; grid-template-columns: 120px 120px; }
      </style>
      <svg id="width" viewBox="0 0 200 100" style="width:100px;height:auto"></svg>
      <svg id="height" viewBox="0,0,200,100" style="height:40px;width:auto"></svg>
      <svg id="max" viewBox="0 0 200 100" style="width:200px;max-width:100px"></svg>
      <svg id="min" viewBox="0 0 200 100" style="width:40px;min-width:80px"></svg>
      <svg id="both" viewBox="0 0 200 100" style="width:80px;height:80px"></svg>
      <svg id="attributes" width="80" height="80" viewBox="0 0 200 100" style="width:100px;height:auto"></svg>
      <div id="flex"><svg id="flex-svg" viewBox="0 0 200 100" style="width:50%"></svg><div style="width:20px;height:10px"></div></div>
      <div id="grid"><svg id="grid-svg" viewBox="0 0 200 100" style="width:100%"></svg></div>
      <div id="after" style="height:10px"></div>
    `,
    queries: [
      'width',
      'height',
      'max',
      'min',
      'both',
      'attributes',
      'flex',
      'flex-svg',
      'grid',
      'grid-svg',
      'after',
    ].map(id => ({ type: 'rect', selector: `#${id}` })),
  });
});

it('image and canvas attribute ratios resolve CSS auto dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 400 },
    html: `
      <style>body { margin:0 } img,canvas { display:block }</style>
      <img id="image-width" width="200" height="100" alt="" style="width:100px;height:auto">
      <img id="image-height" width="200" height="100" alt="" style="width:auto;height:40px">
      <canvas id="canvas-width" width="200" height="100" style="width:100px;height:auto"></canvas>
      <canvas id="canvas-height" width="200" height="100" style="width:auto;height:40px"></canvas>
      <canvas id="canvas-max" width="200" height="100" style="max-width:100px"></canvas>
    `,
    queries: [
      'image-width',
      'image-height',
      'canvas-width',
      'canvas-height',
      'canvas-max',
    ].map(id => ({ type: 'rect', selector: `#${id}` })),
  });
});

it('loaded images supply natural dimensions and their ratio', async () => {
  // A transparent 200x100 PNG; both hosts read the resource's real dimensions.
  const source =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAAZElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4GM48wABem1MwwAAAABJRU5ErkJggg==';
  await expectChromiumParity({
    viewport: { width: 400, height: 400 },
    html: `
      <style>body { margin:0 } img { display:block }</style>
      <img id="natural" src="${source}" alt="">
      <img id="width" src="${source}" style="width:100px;height:auto" alt="">
      <img id="height" src="${source}" style="width:auto;height:40px" alt="">
      <img id="max" src="${source}" style="max-width:100px" alt="">
      <img id="hints" src="${source}" width="80" height="80" style="width:100px;height:auto" alt="">
      <img id="override" src="${source}" width="80" height="80" style="width:100px;height:auto;aspect-ratio:1" alt="">
      <div style="display:flex;width:100px;align-items:flex-start"><img id="flex-image" src="${source}" style="min-width:0" alt=""></div>
      <div style="display:grid;grid-template-columns:100px"><img id="grid-image" src="${source}" style="width:100%" alt=""></div>
    `,
    queries: [
      'natural',
      'width',
      'height',
      'max',
      'hints',
      'override',
      'flex-image',
      'grid-image',
    ].map(id => ({
      type: 'rect',
      selector: `#${id}`,
    })),
  });
});

it.each([
  'auto',
  'border',
  'content',
  'override',
  'max-height',
  'min-height',
  'invalid',
])('intrinsic ratio boundary: %s', async id => {
  await expectChromiumParity({
    viewport: { width: 400, height: 600 },
    html: `
      <style>body { margin:0 } svg,canvas { display:block }</style>
      <svg id="auto" viewBox="0 0 200 100"></svg>
      <svg id="border" viewBox="0 0 200 100" style="width:120px;height:auto;box-sizing:border-box;border:10px solid;padding:10px"></svg>
      <svg id="content" viewBox="0 0 200 100" style="width:100px;height:auto;border:10px solid;padding:10px"></svg>
      <svg id="override" viewBox="0 0 200 100" style="width:100px;aspect-ratio:1"></svg>
      <canvas id="max-height" width="200" height="100" style="max-height:40px"></canvas>
      <canvas id="min-height" width="100" height="50" style="min-height:80px"></canvas>
      <svg id="invalid" viewBox="0 0 0 100" style="width:80px"></svg>
    `,
    queries: [{ type: 'rect', selector: `#${id}` }],
  });
});

it('calculated dimensions retain the intrinsic ratio through layout reconciliation', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 200 },
    html: `
      <style>body { margin:0 } #container { padding:20px } svg { display:block;width:calc(100% - 40px);height:auto }</style>
      <div id="container"><svg id="svg" viewBox="0 0 200 100"></svg></div>
    `,
    queries: [
      { type: 'rect', selector: '#svg' },
      { type: 'rect', selector: '#container' },
    ],
  });
});
