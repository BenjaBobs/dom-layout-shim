---
title: DOM Layout Shim guide
description: Guide to deterministic layout and hit testing with DOM Layout Shim.
eyebrow: Deterministic browser geometry
---

# Layout and hit testing for DOM test harnesses.

Attach a deterministic layout engine to happy-dom, then use familiar DOM
geometry and point-query APIs without launching a browser.

```ts hero
import { attachLayoutEngine } from 'dom-layout-shim'

// Attach once so DOM geometry APIs read from the deterministic layout snapshot.
await attachLayoutEngine({ window })

// Geometry and point queries now share the same computed layout.
const rect = button.getBoundingClientRect()
const target = document.elementFromPoint(
  rect.x + rect.width / 2,
  rect.y + rect.height / 2,
)
```

## Install

Install DOM Layout Shim alongside your DOM implementation. The engine supports
Node.js 22 and newer.

```shell
# Install both packages as test-only dependencies.
pnpm add -D dom-layout-shim happy-dom
```

## Attach the engine

Create the window normally, populate the document, then attach once. Set an
explicit viewport when tests depend on available width or height.

```ts
import { Window } from 'happy-dom'
import { attachLayoutEngine } from 'dom-layout-shim'

const window = new Window()
// Populate the document before attaching the engine.
window.document.body.innerHTML = `
  <button id="save" style="width:120px; height:40px">Save</button>
`

// Use an explicit viewport whenever available space affects the assertion.
await attachLayoutEngine({
  window,
  viewport: { width: 800, height: 600 },
})
```

> Geometry is recomputed after DOM, class, inline-style, stylesheet, CSSOM, and
> scroll changes. Repeated reads use the cached snapshot.

## Use document stylesheets

The engine reads document `<style>` elements, accessible linked stylesheets,
and constructable stylesheets in `document.adoptedStyleSheets`. Document sheets
follow DOM order, and adopted sheets follow them in adoption order, matching
the browser cascade.

```ts
const layoutSheet = new window.CSSStyleSheet()
layoutSheet.replaceSync('.dialog { position:fixed; inset:0 }')
window.document.adoptedStyleSheets = [layoutSheet]

await attachLayoutEngine({ window })

// CSSOM changes and adopted-sheet reordering invalidate cached geometry.
layoutSheet.replaceSync('.dialog { position:fixed; inset:20px }')
dialog.getBoundingClientRect()
```

The engine reads external rules only when the DOM implementation exposes their
`cssRules`. Cross-origin and otherwise inaccessible linked sheets are reported
through `unsupportedCss`: the default policy warns and continues, while strict
mode throws rather than silently omitting the sheet.

Custom properties inherit and cascade before supported layout declarations are
parsed. Local values override inherited values, and fallbacks can contain other
`var()` references:

```ts
window.document.body.innerHTML = `
  <main style="--panel-width: 320px">
    <section id="panel" style="width:var(--panel-width); gap:var(--gap, 8px)"></section>
  </main>
`

await attachLayoutEngine({ window })

// 320: inherited from <main>; --gap uses its 8px fallback.
panel.getBoundingClientRect().width
```

Missing and cyclic references use their declaration fallback when present. An
unresolved supported declaration without a fallback is reported through
`unsupportedCss`.

Responsive `@media` rules use the viewport passed to `attachLayoutEngine`, not
the DOM host's window dimensions:

```ts
const layoutSheet = new window.CSSStyleSheet()
layoutSheet.replaceSync(`
  .sidebar { width: 240px }
  @media (max-width: 600px) { .sidebar { width: 100px } }
`)
window.document.adoptedStyleSheets = [layoutSheet]

await attachLayoutEngine({ window, viewport: { width: 480, height: 800 } })

// 100: the narrow responsive branch matches the configured viewport.
sidebar.getBoundingClientRect().width
```

Media types, width and height ranges, orientation, aspect ratio, query lists,
conjunctions, and nested media rules share the `matchMedia()` evaluator.
Unsupported media features are reported through `unsupportedCss`.

## Configure native controls

Unstyled controls use the cross-host `portable` profile by default. Select it
explicitly to make the test target clear, then override only the control metrics
your environment needs.

```ts
// Keep the portable defaults except for controls your harness customizes.
await attachLayoutEngine({
  window,
  nativeControls: {
    profile: 'portable',
    overrides: {
      textInput: { width: 220 },
      checkboxRadio: { width: 16, height: 16 },
    },
  },
})
```

The text input is now 220 pixels wide while retaining the profile's 23-pixel
height. Overrides merge by control group and metric; replacing every field in
every group defines a fully custom profile. Profiles model outer geometry, not
operating-system painting or internal widget behavior.

## Read layout-backed geometry

Bounding rectangles, offsets, client dimensions, offset parents, scrolling,
and supported transforms come from one snapshot.

```ts
// All of these values come from the same cached layout snapshot.
const save = window.document.querySelector('#save')!
const rect = save.getBoundingClientRect()

console.log(rect.left, rect.top, rect.width, rect.height)
console.log(save.offsetTop, save.offsetLeft, save.offsetParent)
save.scrollIntoView({ block: 'center', inline: 'nearest' })
```

## Test sticky UI

`position: sticky` uses physical `top`, `right`, `bottom`, and `left` insets
against the nearest supported scrolling ancestor, or against the configured
viewport when no such ancestor exists. Sticky boxes remain in normal flow,
move their descendants and hit targets together, and stop at the edge of their
containing block. Table header groups and cells use the same behavior.

```ts
window.document.body.innerHTML = `
  <div style="height:80px; overflow:auto">
    <header id="toolbar" style="position:sticky; top:0; height:30px"></header>
    <main style="height:300px"></main>
  </div>
`

await attachLayoutEngine({ window })

// The toolbar remains at the scrollport top after its container scrolls.
toolbar.getBoundingClientRect().top
```

## Test pointer targets

Point queries respect layout, stacking order, visibility, pointer events,
clipping, scrolling, and supported transforms.

```ts
// Query the element's visual center to verify that it receives the pointer.
const centerX = rect.left + rect.width / 2
const centerY = rect.top + rect.height / 2

expect(window.document.elementFromPoint(centerX, centerY)).toBe(save)
expect(window.document.elementsFromPoint(centerX, centerY)).toContain(save)
```

## Handle unsupported CSS

The default policy warns and continues. Use strict mode when a silent difference
would make a test misleading.

```ts
// Fail fast unless a known visual-only declaration is deliberately ignored.
await attachLayoutEngine({
  window,
  unsupportedCss: {
    default: 'throw',
    overrides: [{ property: 'filter', decision: 'ignore' }],
  },
})
```

Check the [CSS support explorer](./css-support-status.html) for exact syntax,
behavior-specific support claims, Chromium fixtures, and limitations. Select a
fixture to preview its test source without leaving the explorer, or follow its
GitHub link to inspect the repository version.

## Use it in a test lifecycle

Attach after creating the window, reset content between tests, and close the
window when the suite finishes.

```ts
// Give each test an isolated document and layout attachment.
beforeEach(async () => {
  window = new Window()
  await attachLayoutEngine({ window })
})

// Release DOM resources after every test.
afterEach(() => window.close())
```
