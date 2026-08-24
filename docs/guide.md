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

Wrapped inline content follows the native geometry shape: `getClientRects()`
returns one rectangle for each line fragment and `getBoundingClientRect()`
returns the union of those fragments. Inline phrasing content that follows a
block child also contributes its line box to the shared container's height.
Stylesheets may target structural and
state pseudo-classes including `:first-child`, `:nth-child()`, `:last-child`,
`:hover`, `:focus`, and `:disabled`.

## Install

Install DOM Layout Shim alongside your DOM implementation. The engine supports
Node.js 22 and newer.

```shell
# Install both packages as test-only dependencies.
pnpm add -D dom-layout-shim happy-dom
```

The published package includes its Taffy WebAssembly module. Package consumers
do not need Rust or `wasm-pack`; those tools are required only when building
DOM Layout Shim from source.

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

## Configure user-agent styles

The `portable` profile is the default deterministic presentation baseline for
unstyled headings, paragraphs, lists, dialogs, and controls. It does not inspect
the host browser or operating system. Configure the user-agent origin in one
place when an application uses a reset or needs a different baseline:

```ts
await attachLayoutEngine({
  window,
  userAgentStyles: {
    profile: 'portable',
    // These rules remain below application styles in the cascade.
    overrides: 'p { margin: 0 } button { font: inherit }',
  },
})
```

Set `profile: 'none'` to remove portable presentation defaults while retaining
the override CSS. Structural behavior is independent: hidden inputs still do
not generate boxes. Native-control intrinsic geometry also remains independent
under `nativeControls`.

`html` and `body` currently form the engine's synthetic viewport containing
block rather than independent boxes. Their own margins, padding, and geometry
are therefore not yet modeled by profile overrides.

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

Keep shared defaults in test setup and override only responsive scenarios:

```ts
const layout = await attachLayoutEngine({ window })

// Recompute against a phone-sized viewport without remounting the application.
layout.setViewport({ width: 390, height: 844 })
```

`setViewport()` updates shim-backed `window.innerWidth` and `window.innerHeight`,
invalidates cached geometry, updates subsequent `matchMedia()` answers, and
dispatches `window.resize`.

## Observe element resizing

The attached window provides a layout-backed `ResizeObserver`. The engine
retains lazy layout while there are no active observation targets, then batches
observed changes automatically:

```ts
const observer = new window.ResizeObserver(([entry]) => {
  console.log(entry.borderBoxSize[0].inlineSize)
})

observer.observe(panel, { box: 'border-box' })
```

For tests that need an explicit synchronization point, disable automatic
observer delivery and flush after making changes:

```ts
const layout = await attachLayoutEngine({
  window,
  observers: { delivery: 'manual' },
})

panel.style.width = '320px'
layout.flushLayout()
```

`flushLayout()` recomputes dirty geometry and synchronously settles pending
layout-backed observer callbacks. Reading geometry still computes lazily but
does not implicitly deliver observer callbacks.

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

## Place named grid areas

Rectangular `grid-template-areas` definitions place children whose `grid-area`
names match the template. Areas may span rows and columns, and `.` leaves an
unnamed cell. These templates and placements are passed directly to Taffy's
native named-area model:

```ts
window.document.body.innerHTML = `
  <main style='display:grid; grid-template-columns:80px 120px;
    grid-template-areas:"nav content"'>
    <nav style="grid-area:nav"></nav>
    <article id="content" style="grid-area:content"></article>
  </main>
`

await attachLayoutEngine({ window })

// The article begins after the 80px navigation track.
content.getBoundingClientRect().left
```

Named grid lines and escaped area identifiers remain unsupported.

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

Layout declarations can use `em`, `rem`, viewport units, custom properties, and
`calc()` expressions when the result reduces to one supported length,
percentage, or number. Mixed percentage-and-pixel dimensions such as
`calc(100% - 32px)` resolve when their containing-block axis is definite.

Percentage insets resolve against the corresponding definite containing-block
axis. Nested positioned stacking contexts keep descendant `z-index` values
inside the ancestor context during point queries.
The exported `HitBox` type exposes this optional nested paint key as
`stackingOrder` for diagnostic consumers.

Two-dimensional translation, scaling, rotation, skew, and matrix transforms
project client rectangles and hit-test regions. Rotated and skewed elements use
their transformed quadrilateral for point queries.

Custom text measurers receive the resolved numeric font weight and letter
spacing so component typography can influence intrinsic geometry.
They also receive text after inherited `none`, `uppercase`, `lowercase`, or
`capitalize` transformation. The DOM's authored `textContent` is unchanged.

Without a custom measurer, attachment discovers initial `@font-face` rules and
loads static TTF, OTF, and WOFF URL or data sources. It selects the closest
discovered numeric weight in the authored family list and measures glyph
advances and kerning directly from that font. Unavailable families, `local()`
sources, and WOFF2 sources use deterministic fallback measurement.

Supported selectors include structural and state pseudo-classes, `:is()`,
`:where()`, `:not()`, `:has()`, and case-insensitive terminal HTML attribute
selectors. String and `attr()` content generated by `::before` and `::after`
contributes to intrinsic text layout. A generated pseudo-element with a
non-inline `display` contributes its own anonymous box, dimensions, spacing,
and flex or grid item placement. For example, `::before { content: "";
display: block; height: 12px; margin-bottom: 3px }` reserves 15px before the
originating element's ordinary content.

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

## Explore UI-library examples

The [UI library examples](./examples.html) implement the same task workspace in
Material UI and Ant Design. Their tests attach DOM Layout Shim to happy-dom and
exercise geometry-derived pointer targets, scrollable content, portalled menus,
modal blocking, and layout invalidation through real library components.

The hosted pages run in a browser for visual inspection. They complement rather
than replace Chromium parity fixtures: each example publishes its known
compatibility limitations alongside the working scenario.

Run `pnpm run examples:compatibility` to execute every named checkpoint in both
Chromium and happy-dom with the shim. The command reports observation coverage,
agreement by geometry, visibility, and hit testing, repeated difference groups,
stability, computed layout inputs, hit-test stacks, and unsupported CSS observed
on the example elements. An ordinary difference does not fail the command; only
failure to execute or capture the report does.

The generated `examples/*/compatibility-report.json` files are ignored build
artifacts. Run the command before local documentation generation when fresh
reports are needed. Documentation CI always regenerates them with its installed
Chromium before assembling the deployment artifact.

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
