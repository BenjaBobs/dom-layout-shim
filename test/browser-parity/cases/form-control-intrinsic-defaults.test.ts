import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

const nativeButtonTolerance = {
  tolerance: { width: 12, height: 2 },
  toleranceReason: 'Native button font and theme metrics vary across Chromium host platforms.',
} as const

const nativeTextInputTolerance = {
  tolerance: { width: 8, height: 2 },
  toleranceReason: 'Native text input font and theme metrics vary across Chromium host platforms.',
} as const

const nativeFileInputTolerance = {
  tolerance: { width: 24, height: 4 },
  toleranceReason: 'Native file input labels and theme metrics vary across Chromium host platforms.',
} as const

const nativeTextareaTolerance = {
  tolerance: { width: 1, height: 8 },
  toleranceReason: 'Native textarea row and column metrics vary across Chromium host platforms.',
} as const

const nativeSelectTolerance = {
  tolerance: { width: 20, height: 4 },
  toleranceReason: 'Native select option fonts and theme metrics vary across Chromium host platforms.',
} as const

const nativeControlTolerance = {
  tolerance: { width: 2, height: 3 },
  toleranceReason: 'Native control theme metrics vary across Chromium host platforms.',
} as const

it('common form controls expose native intrinsic sizes independently', async () => {
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
      { type: 'rect', selector: '#button', ...nativeButtonTolerance },
      { type: 'rect', selector: '#text', ...nativeTextInputTolerance },
      { type: 'rect', selector: '#text-sized', ...nativeTextInputTolerance },
      { type: 'rect', selector: '#password-sized', ...nativeTextInputTolerance },
      { type: 'rect', selector: '#search-sized', ...nativeTextInputTolerance },
      { type: 'rect', selector: '#email-sized', ...nativeTextInputTolerance },
      { type: 'rect', selector: '#number-sized', ...nativeTextInputTolerance },
      { type: 'rect', selector: '#input-button', ...nativeButtonTolerance },
      { type: 'rect', selector: '#input-submit', ...nativeButtonTolerance },
      { type: 'rect', selector: '#input-reset', ...nativeButtonTolerance },
      { type: 'rect', selector: '#checkbox', ...nativeControlTolerance },
      { type: 'rect', selector: '#radio', ...nativeControlTolerance },
      { type: 'rect', selector: '#range', ...nativeControlTolerance },
      { type: 'rect', selector: '#color', ...nativeControlTolerance },
      { type: 'rect', selector: '#hidden' },
      { type: 'rect', selector: '#image' },
      { type: 'rect', selector: '#time', ...nativeControlTolerance },
      { type: 'rect', selector: '#file', ...nativeFileInputTolerance },
      { type: 'rect', selector: '#textarea', ...nativeTextareaTolerance },
      { type: 'rect', selector: '#textarea-sized', ...nativeTextareaTolerance },
      { type: 'rect', selector: '#select', ...nativeSelectTolerance },
      { type: 'rect', selector: '#select-long', ...nativeSelectTolerance },
      { type: 'rect', selector: '#select-sized', ...nativeSelectTolerance },
      { type: 'rect', selector: '#select-multiple', ...nativeSelectTolerance },
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

        textarea {
          display: block;
          width: 100px;
          height: 60px;
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
      { type: 'rect', selector: '#textarea' },
      { type: 'dimensions', selector: '#textarea' },
      { type: 'rect', selector: '#select' },
    ],
  })
})
