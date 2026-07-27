import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('common form controls expose native intrinsic sizes in block flow', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        button,
        input,
        textarea,
        select,
        progress,
        meter {
          display: block;
          position: absolute;
          left: 0;
          top: 0;
        }
      </style>
      <button id="button">Save</button>
      <input id="text">
      <input id="text-sized" size="10">
      <input id="password-sized" type="password" size="10">
      <input id="search-sized" type="search" size="10">
      <input id="email-sized" type="email" size="10">
      <input id="number-sized" type="number" size="10">
      <input id="input-button" type="button">
      <input id="input-submit" type="submit">
      <input id="input-reset" type="reset">
      <input id="checkbox" type="checkbox">
      <input id="radio" type="radio">
      <input id="range" type="range">
      <input id="color" type="color">
      <input id="hidden" type="hidden">
      <input id="image" type="image" width="40" height="30">
      <input id="time" type="time">
      <input id="file" type="file">
      <textarea id="textarea"></textarea>
      <textarea id="textarea-sized" cols="10" rows="4"></textarea>
      <select id="select"><option>One</option></select>
      <select id="select-long"><option>Long option</option></select>
      <select id="select-sized" size="4">
        <option>One</option>
        <option>Two</option>
        <option>Three</option>
        <option>Four</option>
      </select>
      <select id="select-multiple" multiple>
        <option>One</option>
        <option>Two</option>
      </select>
      <progress id="progress"></progress>
      <meter id="meter" value=".5"></meter>
    `,
    queries: [
      { type: 'rect', selector: '#button', tolerance: { width: 2, height: 2 } },
      { type: 'rect', selector: '#text' },
      { type: 'rect', selector: '#text-sized' },
      { type: 'rect', selector: '#password-sized' },
      { type: 'rect', selector: '#search-sized' },
      { type: 'rect', selector: '#email-sized' },
      { type: 'rect', selector: '#number-sized' },
      { type: 'rect', selector: '#input-button' },
      { type: 'rect', selector: '#input-submit' },
      { type: 'rect', selector: '#input-reset' },
      { type: 'rect', selector: '#checkbox' },
      { type: 'rect', selector: '#radio' },
      { type: 'rect', selector: '#range' },
      { type: 'rect', selector: '#color' },
      { type: 'rect', selector: '#hidden' },
      { type: 'rect', selector: '#image' },
      { type: 'rect', selector: '#time' },
      { type: 'rect', selector: '#file' },
      { type: 'rect', selector: '#textarea', tolerance: { width: 1, height: 4 } },
      { type: 'rect', selector: '#textarea-sized', tolerance: { width: 1, height: 8 } },
      { type: 'rect', selector: '#select' },
      { type: 'rect', selector: '#select-long' },
      { type: 'rect', selector: '#select-sized' },
      { type: 'rect', selector: '#select-multiple' },
      { type: 'rect', selector: '#progress' },
      { type: 'rect', selector: '#meter' },
    ],
  })
})

it('author width and height override form control intrinsic sizes', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        input {
          display: block;
          width: 80px;
          height: 30px;
        }

        #select {
          display: block;
          width: 120px;
          height: 80px;
        }
      </style>
      <input id="text">
      <input id="text-sized" size="10">
      <input id="image" type="image" width="40" height="20">
      <input id="file" type="file">
      <textarea id="textarea" cols="10" rows="4"></textarea>
      <select id="select" size="4"><option>One</option></select>
    `,
    queries: [
      { type: 'rect', selector: '#text' },
      { type: 'dimensions', selector: '#text' },
      { type: 'rect', selector: '#text-sized' },
      { type: 'dimensions', selector: '#text-sized' },
      { type: 'rect', selector: '#image' },
      { type: 'dimensions', selector: '#image' },
      { type: 'rect', selector: '#file' },
      { type: 'dimensions', selector: '#file' },
      { type: 'rect', selector: '#textarea', tolerance: { width: 1, height: 8 } },
      {
        type: 'dimensions',
        selector: '#textarea',
        tolerance: {
          offsetWidth: 1,
          offsetHeight: 8,
          clientWidth: 1,
          clientHeight: 8,
        },
      },
      { type: 'rect', selector: '#select' },
    ],
  })
})
