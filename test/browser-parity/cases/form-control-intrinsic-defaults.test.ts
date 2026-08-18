import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import {
  expectChromiumParity,
  measureBrowserParityFixture,
  type BrowserParityFixture,
  type BrowserParityQuery,
  type QueryResult,
} from '../parity-harness.ts'

type NativeControlSizes = Record<string, [width: number, height: number]>
type NativeControlSnapshots = {
  chromium: Record<string, { chromiumVersion: string; runnerImage: string; sizes: NativeControlSizes }>
  profiles: { portable: { sizes: NativeControlSizes } }
}

const nativeControlSnapshots = JSON.parse(readFileSync(
  new URL('../snapshots/native-control-sizes.json', import.meta.url),
  'utf8',
)) as NativeControlSnapshots

const nativeControlFixture = {
  viewport: { width: 500, height: 300 },
  nativeControlProfile: 'portable',
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
      { type: 'rect', selector: '#button' },
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
      { type: 'rect', selector: '#file' },
      { type: 'rect', selector: '#select' },
      { type: 'rect', selector: '#select-long' },
      { type: 'rect', selector: '#select-sized' },
      { type: 'rect', selector: '#select-multiple' },
      { type: 'rect', selector: '#progress' },
      { type: 'rect', selector: '#meter' },
      { type: 'rect', selector: '#time' },
      { type: 'rect', selector: '#textarea' },
      { type: 'rect', selector: '#textarea-sized' },
  ],
} as const satisfies BrowserParityFixture

it('native control sizes match the Chromium host and portable profile snapshots', async () => {
  const result = await measureBrowserParityFixture(nativeControlFixture)
  const platform = `${process.platform}-${process.arch}`
  const chromiumSnapshot = nativeControlSnapshots.chromium[platform]

  expect(extractNativeControlSizes(result.queries, result.engine)).toEqual(
    nativeControlSnapshots.profiles.portable.sizes,
  )

  if (process.env.ImageOS) {
    expect(chromiumSnapshot, `Missing native-control snapshot for ${platform}`).toBeDefined()
    expect(chromiumSnapshot?.runnerImage.startsWith(`${process.env.ImageOS}@`)).toBe(true)
    expect(result.chromiumVersion).toBe(chromiumSnapshot?.chromiumVersion)
    expect(extractNativeControlSizes(result.queries, result.chromium)).toEqual(chromiumSnapshot?.sizes)
  }
})

function extractNativeControlSizes(queries: BrowserParityQuery[], results: QueryResult[]): NativeControlSizes {
  return Object.fromEntries(queries.map((query, index) => {
    if (query.type !== 'rect') {
      throw new Error(`Native-control snapshot query must be a rect query, received ${query.type}`)
    }

    const rect = results[index]?.rect
    if (!rect) {
      throw new Error(`Missing native-control rectangle for ${query.selector}`)
    }

    return [query.selector.slice(1), [rect.width, rect.height]]
  }))
}

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
      <input id="time" type="time">
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
      { type: 'rect', selector: '#time' },
      { type: 'dimensions', selector: '#time' },
      { type: 'rect', selector: '#textarea' },
      { type: 'dimensions', selector: '#textarea' },
      { type: 'rect', selector: '#select' },
    ],
  })
})

it('styled flex buttons include text, inline icons, gaps, padding, and borders', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body { margin: 0; }
        button {
          position: absolute;
          top: 0;
          left: 0;
          display: inline-flex;
          box-sizing: border-box;
          align-items: center;
          width: auto;
          height: 32px;
          padding: 0 15px;
          border: 1px solid;
          gap: 8px;
          font-family: 'DOM Layout Shim Deterministic';
          font-size: 14px;
          font-weight: 400;
          line-height: 22px;
        }
        svg { width: 14px; height: 14px; }
        #with-icon { top: 40px; }
      </style>
      <button id="text-only">Add task</button>
      <button id="with-icon"><span><svg width="14" height="14"></svg></span><span>Add task</span></button>
    `,
    queries: [
      { type: 'rect', selector: '#text-only' },
      { type: 'rect', selector: '#with-icon' },
    ],
  })
})
