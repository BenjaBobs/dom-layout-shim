import { it } from 'vitest';
import { expectChromiumParity } from '../parity-harness.ts';

for (const source of ['inline', 'stylesheet']) {
  for (const size of ['min-content', 'max-content', 'fit-content']) {
    for (const width of [40, 80, 240]) {
      it(`${source} width ${size} in ${width}px containing block`, async () => {
        const declaration = `width: ${size}; padding: 4px; border: 2px solid;`;
        await expectChromiumParity({
          typography: 'deterministic',
          viewport: { width: 400, height: 300 },
          html: `<style>body { margin: 0; } #parent { width: ${width}px; }
            ${source === 'stylesheet' ? `#target { ${declaration} }` : ''}</style>
            <div id="parent"><div id="target" style="${source === 'inline' ? declaration : ''}">hello wide world</div></div>`,
          queries: [{ type: 'rect', selector: '#target' }],
        });
      });
    }
  }
  for (const size of [
    'auto',
    'min-content',
    'max-content',
    'fit-content(90px)',
    'fit-content(30%)',
  ]) {
    for (const implicit of [false, true]) {
      it(`${source} ${implicit ? 'implicit' : 'explicit'} grid tracks ${size}`, async () => {
        const declaration = `display: grid; width: 300px; grid-auto-flow: column;
          grid-template-rows: auto; ${implicit ? 'grid-auto-columns' : 'grid-template-columns'}: ${implicit ? size : `${size} ${size}`};`;
        await expectChromiumParity({
          typography: 'deterministic',
          viewport: { width: 400, height: 300 },
          html: `<style>body { margin: 0; }
            ${source === 'stylesheet' ? `#parent { ${declaration} }` : ''}</style>
            <div id="parent" style="${source === 'inline' ? declaration : ''}">
              <div id="first">hello wide world</div><div id="second">short text</div>
            </div>`,
          queries: [
            { type: 'rect', selector: '#parent' },
            { type: 'rect', selector: '#first' },
            { type: 'rect', selector: '#second' },
          ],
        });
      });
    }
  }
}

for (const size of ['min-content', 'max-content', 'fit-content']) {
  for (const property of ['height', 'inline-size']) {
    it(`${property} supports ${size}`, async () => {
      await expectChromiumParity({
        typography: 'deterministic',
        viewport: { width: 400, height: 300 },
        html: `<style>body { margin: 0; } #parent { width: 80px; }
          #target { ${property}: ${size}; padding: 4px; border: 2px solid; }</style>
          <div id="parent"><div id="target">hello wide world</div></div>`,
        queries: [{ type: 'rect', selector: '#target' }],
      });
    });
  }
  it(`nested block width ${size}`, async () => {
    await expectChromiumParity({
      typography: 'deterministic',
      viewport: { width: 400, height: 300 },
      html: `<style>body { margin: 0; } #parent { width: 80px; }
        #target { width: ${size}; padding: 4px; border: 2px solid; }</style>
        <div id="parent"><div id="target"><div id="child">hello wide world</div></div></div>`,
      queries: [
        { type: 'rect', selector: '#target' },
        { type: 'rect', selector: '#child' },
      ],
    });
  });
}

it('integer repeat accepts intrinsic and fit-content tracks', async () => {
  await expectChromiumParity({
    typography: 'deterministic',
    viewport: { width: 400, height: 300 },
    html: `<style>body { margin: 0; } #parent { display: grid; width: 300px;
      grid-template-columns: repeat(1, min-content max-content fit-content(30%)); }
      </style><div id="parent"><div id="first">hello world</div>
      <div id="second">hello world</div><div id="third">hello world</div></div>`,
    queries: ['#first', '#second', '#third'].map(selector => ({
      type: 'rect',
      selector,
    })),
  });
});
