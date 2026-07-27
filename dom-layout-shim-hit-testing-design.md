# Deterministic Layout + Hit Testing for DOM Unit Tests

Date: 2026-04-28

## Goal

Build a fast test-time layout and hit-testing layer on top of a lightweight DOM environment such as `happy-dom`.

The goal is **not** to create a browser. The goal is to make common UI unit tests more trustworthy by supporting APIs and checks that normally require layout:

- `HTMLElement.prototype.getBoundingClientRect()`
- `document.elementFromPoint(x, y)`
- `document.elementsFromPoint(x, y)`
- "Can this element receive a click at its center?"
- "Is this button hidden behind a modal/backdrop/overlay?"
- "Does this dropdown/menu/tooltip stack above the thing it should stack above?"

The intended use case is a component test suite where full browser tests via Playwright are too heavy for every case, but `happy-dom`/`jsdom` are too fake for layout-sensitive assertions.

## Non-goals

This project should not try to be browser-perfect.

Explicit non-goals:

- Full CSS cascade compatibility.
- Pixel-perfect Chrome/Firefox/WebKit layout.
- Full browser stacking context behavior.
- Full inline layout.
- Full font fallback behavior.
- CSS animations/transitions.
- Painting, screenshots, compositing, or accessibility tree generation.
- Replacing all Playwright/Vitest Browser Mode tests.

The output should be framed as:

> A deterministic layout and hit-test oracle for an explicitly supported CSS subset.

Not:

> A browser-compatible rendering engine.

## Proposed Stack

### `happy-dom`

Use `happy-dom` as the DOM shell.

Responsibilities:

- `document`, `window`, `HTMLElement`, events, mutation observers, custom elements, etc.
- Test environment integration.
- Basic DOM behavior that should not be reimplemented.

What it does **not** provide for this project:

- Real layout.
- Browser-grade hit testing.
- Reliable `getBoundingClientRect()`.
- Reliable `elementFromPoint()`.

### Taffy

Use Taffy for layout.

Responsibilities:

- Block-like layout, where supported.
- Flexbox.
- Grid.
- Absolute positioning support, where available and mapped correctly.
- Deterministic box calculation.
- Width/height/margin/padding/gap handling.

Taffy is the core geometry engine. The project should not reimplement Flexbox or Grid unless absolutely forced to.

Important design rule:

> Keep Taffy behind an adapter. Do not let the rest of the package depend directly on Taffy-specific details.

### Pretext

Use Pretext for text measurement/layout.

Responsibilities:

- Text leaf measurement.
- Multiline text height.
- Text wrapping within known width constraints.
- Deterministic text size for buttons, labels, cards, list rows, etc.

Important design rule:

> Put text measurement behind an interface so Pretext can be replaced or supplemented by a simpler deterministic fallback.

Example interface:

```ts
type TextMeasureInput = {
  text: string
  font: string
  maxWidth: number | undefined
  lineHeight: number
  whiteSpace: 'normal' | 'pre-wrap' | 'nowrap'
}

type TextMeasurer = {
  measure(input: TextMeasureInput): { width: number; height: number }
}
```

### CSS Parsing

Use Lightning CSS for stylesheet parsing from the start.

Initial approach:

1. Inline styles through a small declaration-block parser.
2. `<style>` elements through Lightning CSS.
3. Explicit class map, if useful.
4. Small Tailwind-like class parser, if useful.

Do **not** begin by trying to parse the application's full CSS bundle.
The parser should accept real CSS syntax, but the resolver should still enforce
the intentionally small supported CSS subset.

## High-Level Architecture

```txt
document-like object
    happy-dom, jsdom, or another DOM test harness
    ↓
LayoutEngine attachment
    explicit initialize / attach / detach lifecycle
    ↓
DOM traversal
    ↓
supported style extraction
    ↓
TestStyle objects
    ↓
layout source
    v0: small document-derived CSS subset
    later: Taffy layout tree
    ↓
text measurement for leaf nodes
    deterministic fallback first
    later: Pretext behind an adapter
    ↓
computed layout boxes
    ↓
stacking / hit-test model
    ↓
patched DOM APIs:
    - getBoundingClientRect()
    - elementFromPoint()
    - elementsFromPoint()
    - optional click guards
```

## Suggested Package Shape

Possible package name:

```txt
dom-layout-shim
```

Usage:

```ts
// vitest.setup.ts
import { createLayoutEngine } from 'dom-layout-shim'

const layoutEngine = createLayoutEngine({
  viewport: { width: 1280, height: 720 },
  unsupportedCss: {
    default: 'throw',
  },
})

await layoutEngine.initialize()
layoutEngine.attachTo(document)
```

Vitest config:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Example test:

```ts
const button = screen.getByRole('button', { name: /save/i })

const rect = button.getBoundingClientRect()
const top = document.elementFromPoint(
  rect.left + rect.width / 2,
  rect.top + rect.height / 2,
)

expect(top === button || button.contains(top)).toBe(true)
```

The exact public API is not locked down yet, but the design should stay close
to this lifecycle:

```ts
const layoutEngine = createLayoutEngine({ /* config */ })
await layoutEngine.initialize()

const attachment = layoutEngine.attachTo(document)

const button = document.getElementById('save')!
const rect = attachment.getBoundingClientRect(button)
const clickable = attachment.receivesPointerAtCenter(button)

attachment.detach()
```

The core package must be framework agnostic. It should know about DOM-like
documents and elements, not React, Vue, Svelte, Testing Library, or any other
component framework. Framework-specific helpers can be added later as optional
entry points if they prove useful.

The core API should be document-driven. Consumers should find elements using
normal DOM APIs and then ask the attachment or patched DOM APIs about geometry
and hit testing. Public manual box registration would defeat the purpose of the
tool and should not be part of the main API.

Suggested source layout:

```txt
src/
  index.ts

  engine/
    create-layout-engine.ts
    layout-engine.ts

  attachment/
    attach-to-document.ts
    document-attachment.ts
    patch-dom-apis.ts

  browser-dom/
    document-like.ts
    element-like.ts

  css/
    inline-style-source.ts
    stylesheet-source.ts
    supported-declaration.ts
    unsupported-css-policy.ts

  geometry/
    box.ts
    dom-rect.ts
    point.ts

  hit-testing/
    hit-box.ts
    point-query.ts
    stacking-order.ts

  layout/
    document-layout-source.ts
    layout-source.ts

  taffy/
    taffy-host.ts
    taffy-layout-source.ts

  debug/
    debug-layout.ts

test/
  unit/
  browser-parity/
    fixtures/
    chromium.spec.ts
  bench/

docs/
  supported-css.md
```

Avoid a global `types.ts`. Types should live near the behavior that owns them:
`HitBox` in hit testing, `Box` in geometry, document abstractions in
`browser-dom`, and so on. Public types can be re-exported from package entry
points.

## Proposed Supported CSS Subset

The first version should be intentionally strict.

### Layout

Support:

```txt
display: block | flex | grid | none
position: static | relative | absolute | fixed
box-sizing: border-box | content-box
width
height
min-width
min-height
max-width
max-height
margin
padding
border-width
gap
```

For Flexbox:

```txt
flex-direction
flex-wrap
align-items
justify-content
flex-grow
flex-shrink
flex-basis
```

For Grid:

```txt
grid-template-columns
grid-template-rows
grid-column
grid-row
```

Only support the grid syntax that Taffy can handle and that the project actually uses.

### Positioning

Support:

```txt
top
right
bottom
left
inset
z-index
```

### Hit Testing

Support:

```txt
pointer-events: auto | none
visibility: visible | hidden
display: none
opacity: 0 as non-hit-testable, if desired by project policy
```

### Text

Support:

```txt
font-size
font-family
font-weight
line-height
white-space: normal | pre-wrap | nowrap
text-align, only if needed
```

### Explicitly Unsupported Initially

Unsupported CSS should throw by default.

Unsupported initially:

```txt
transform, except maybe translate() later
filter
backdrop-filter
opacity-based stacking contexts, except simple opacity: 0 policy
isolation
contain
will-change
position: sticky
animations
transitions
pseudo-elements
complex selectors
complex media queries
full inline formatting
browser UA default styles
```

Consumers should be able to decide what happens for each unsupported CSS rule.
The default policy should be strict because silent approximation creates false
confidence, but known-irrelevant declarations such as `transition` or CSS custom
properties may be reasonable to ignore in a given test suite.

Example policy:

```ts
const layoutEngine = createLayoutEngine({
  unsupportedCss: {
    default: 'throw',
    properties: {
      transition: 'ignore',
      animation: 'ignore',
      '--brand-color': 'ignore',
    },
    property(property, context) {
      if (property.startsWith('--')) {
        return 'ignore'
      }

      return context.defaultDecision
    },
  },
})
```

Initial decision type:

```ts
type UnsupportedCssDecision = 'ignore' | 'throw'
```

The callback should receive enough context to make policy decisions:

```ts
type UnsupportedCssContext = {
  property: string
  value: string
  reason: 'unknown-property' | 'unsupported-value' | 'unsupported-rule'
  source: 'inline-style' | 'stylesheet'
  selector?: string
  element?: Element
  defaultDecision: UnsupportedCssDecision
}
```

Policy resolution order:

1. Specific property map.
2. Callback.
3. Default policy.

Do not add a warning mode until there is a clear logger story. For v1, a rule
is either explicitly ignored or it throws.

## Style Resolution Strategy

The style resolver is one of the most important pieces.

Initial strategy:

```txt
default test style
  + supported stylesheet rules parsed by Lightning CSS
  + known class map, if explicitly configured
  + inline style
  = TestStyle
```

Example:

```ts
const classMap = {
  flex: { display: 'flex' },
  grid: { display: 'grid' },
  absolute: { position: 'absolute' },
  fixed: { position: 'fixed' },
  relative: { position: 'relative' },
  'inset-0': { top: 0, right: 0, bottom: 0, left: 0 },
  'z-10': { zIndex: 10 },
  'z-50': { zIndex: 50 },
  'pointer-events-none': { pointerEvents: 'none' },
}
```

Unknown classes and unsupported declarations should fail by default:

```ts
throw new Error(`Unsupported class in test layout engine: ${className}`)
```

This is stricter than a browser, but better for test trustworthiness. Consumers
can opt into ignoring specific unsupported CSS through the unsupported CSS
policy.

The first useful implementation should not expose manual box registration as a
public API. It should derive layout from the document, even if the supported CSS
subset is initially tiny. A proof-of-concept fixture may use explicit CSS such
as:

```html
<style>
  #save {
    position: absolute;
    left: 100px;
    top: 80px;
    width: 120px;
    height: 40px;
    z-index: 10;
  }
</style>

<button id="save">Save</button>
```

Chromium should use real browser layout for this fixture. The happy-dom runner
should parse the supported CSS and compute equivalent boxes through the layout
engine.

## Internal Data Model

### `TestStyle`

The resolved style used by the engine.

```ts
type TestStyle = {
  display: 'block' | 'flex' | 'grid' | 'none'
  position: 'static' | 'relative' | 'absolute' | 'fixed'
  boxSizing: 'border-box' | 'content-box'

  width?: number | 'auto'
  height?: number | 'auto'
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number

  margin: Edges
  padding: Edges
  border: Edges
  gap?: number

  flexDirection?: 'row' | 'column'
  flexWrap?: 'nowrap' | 'wrap'
  alignItems?: 'stretch' | 'start' | 'center' | 'end'
  justifyContent?: 'start' | 'center' | 'end' | 'space-between'
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | 'auto'

  gridTemplateColumns?: unknown
  gridTemplateRows?: unknown
  gridColumn?: unknown
  gridRow?: unknown

  left?: number
  top?: number
  right?: number
  bottom?: number

  zIndex: number
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden'
  overflow: 'visible' | 'hidden'

  font: string
  fontSize: number
  lineHeight: number
  whiteSpace: 'normal' | 'pre-wrap' | 'nowrap'
}

type Edges = {
  top: number
  right: number
  bottom: number
  left: number
}
```

### `HitBox`

The final flattened layout result used for browser API patches.

```ts
type HitBox = {
  el: Element
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  domOrder: number
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden'
}
```

If clipping is intentionally skipped, do not include clipping behavior accidentally. Document that `overflow: hidden` is unsupported or ignored.

## Taffy Integration

Taffy should be accessed through a small adapter.

Responsibilities of the adapter:

- Initialize WASM once.
- Create a layout tree.
- Create leaf nodes.
- Create parent nodes.
- Compute layout with fixed viewport.
- Return computed boxes.
- Hide Taffy-specific object types from the rest of the package.

Sketch:

```ts
export class LayoutHost {
  createLeaf(style: TestStyle, measure?: MeasureFn): LayoutNode {
    // convert TestStyle -> Taffy Style
    // create Taffy leaf
  }

  createNode(style: TestStyle, children: LayoutNode[]): LayoutNode {
    // convert TestStyle -> Taffy Style
    // create Taffy node with children
  }

  compute(root: LayoutNode, viewport: { width: number; height: number }): void {
    // compute Taffy layout
  }

  getBox(node: LayoutNode): Box {
    // read Taffy layout
  }
}
```

Important:

- WASM initialization is async.
- DOM APIs are sync.
- Therefore, initialize the engine in test setup before tests run.
- After initialization, patched APIs must be synchronous.

## DOM Patching

Patch only a small set of APIs.

Required:

```txt
HTMLElement.prototype.getBoundingClientRect
document.elementFromPoint
document.elementsFromPoint
```

Optional:

```txt
HTMLElement.prototype.offsetWidth
HTMLElement.prototype.offsetHeight
HTMLElement.prototype.clientWidth
HTMLElement.prototype.clientHeight
HTMLElement.prototype.scrollWidth
HTMLElement.prototype.scrollHeight
```

Click safety helper:

```ts
function receivesPointerAtCenter(attachment: DocumentAttachment, el: HTMLElement): boolean {
  const rect = attachment.getBoundingClientRect(el)

  const top = attachment.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  )

  return top === el || el.contains(top)
}
```

Optional Testing Library / user-event guard:

```ts
async function guardedClick(el: HTMLElement) {
  if (!receivesPointerAtCenter(el)) {
    throw new Error('Element does not receive pointer events at its center')
  }

  el.click()
}
```

Avoid globally monkey-patching too much at first. Prefer explicit helpers until the behavior is proven.

## Layout Invalidation

The engine needs to know when layout is dirty.

Dirty on:

```txt
DOM child changes
attribute changes: class, style, hidden, etc.
textContent changes
viewport changes
manual style map changes
scroll changes, if scroll is supported later
```

Use `MutationObserver`:

```ts
const observer = new MutationObserver(() => {
  dirty = true
})

observer.observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  characterData: true,
})
```

Expose manual control:

```ts
attachment.recompute()
attachment.markDirty()
```

## Stacking and Hit Testing

This is the most important homebrew piece.

Suggested v1 stacking model:

1. Exclude `display: none`.
2. Exclude `visibility: hidden`.
3. Exclude `pointer-events: none`.
4. Include boxes containing the point.
5. Sort by numeric `z-index`, highest first.
6. For equal `z-index`, sort by DOM order, later elements first.

Pseudo-code:

```ts
function elementFromPoint(x: number, y: number): Element | null {
  return boxes
    .filter(b => b.visibility !== 'hidden')
    .filter(b => b.pointerEvents !== 'none')
    .filter(b => containsPoint(b, x, y))
    .sort(compareHitOrder)[0]?.el ?? null
}

function compareHitOrder(a: HitBox, b: HitBox): number {
  if (a.zIndex !== b.zIndex) {
    return b.zIndex - a.zIndex
  }

  return b.domOrder - a.domOrder
}
```

This is not browser-perfect, but it is deterministic and useful.

The project must document the stacking model clearly.

## Test Strategy

The test suite should have three lanes from the beginning.

### Unit Tests

Use Vitest with happy-dom. These tests exercise the package API and internal
invariants directly against a DOM-like document:

- engine initialization and attachment lifecycle
- DOM API patching and restoration
- document traversal
- supported CSS extraction
- unsupported CSS policy behavior
- hit-test ordering
- clickability helpers

### Browser Parity Tests

Use Playwright Chromium as the first browser target. Each parity test should
apply the same fixture and the same interaction to:

1. A real Chromium page.
2. A happy-dom document with the layout engine attached.

Then compare normalized results. Results should use stable identifiers such as
selectors, ids, or test ids rather than object identity.

Example interaction result:

```ts
type PointQueryResult = {
  elementFromPoint: string | null
  elementsFromPoint: string[]
}
```

Browser parity tests should only compare explicitly supported behavior. If the engine
intentionally differs from Chromium for an unsupported feature, that difference
should be documented instead of hidden inside a fixture.

### Benchmarks

Benchmarks should exist before the engine becomes sophisticated. They should
track the cost of traversal, style extraction, recomputation, point queries, and
eventual Taffy/text-measurement integration.

## Unsolved Problems / Open Questions

### 1. Exact Taffy JS Binding Choice

There are multiple ways to consume Taffy from JavaScript/WASM. The project needs to choose the binding with the best maintenance story and API ergonomics.

Open questions:

- Which package should be used?
- Does it expose all needed Taffy features?
- Does it support measure callbacks well enough?
- Does it work cleanly under Bun, Node, and Vitest workers?
- Does it support Grid features needed by the app?

### 2. Async WASM Initialization

Taffy initialization is async, while DOM APIs are sync.

Open questions:

- Should `layoutEngine.initialize()` initialize Taffy eagerly or lazily?
- Should there be a separate lower-level `await initTaffyHost()`?
- How should accidental use before initialization fail?

Recommended model:

```ts
const layoutEngine = createLayoutEngine(config)
await layoutEngine.initialize()
layoutEngine.attachTo(document)
```

or in Vitest:

```ts
beforeAll(async () => {
  await layoutEngine.initialize()
})
```

### 3. Test Isolation and Concurrency

The engine should avoid shared mutable layout trees.

Open questions:

- One layout tree per document?
- One layout tree per test?
- One layout tree per render root?
- How should `test.concurrent` be handled?

Recommended model:

- Store layout state in a `WeakMap<Document, LayoutState>`.
- Reset after each test.
- Avoid `test.concurrent` for tests sharing the same `document`.
- Allow parallel test files, assuming each file has isolated environment state.

### 4. CSS Cascade Depth

A full cascade is expensive.

Open questions:

- Is a class map enough?
- Do inline styles cover most layout-sensitive tests?
- Is Tailwind class parsing needed?
- Is actual CSS parsing needed?
- Should unknown classes fail or be ignored?

Recommended v1:

- Explicit class map.
- Inline style parser.
- Throw on unknown layout-relevant classes.

### 5. Browser Default Styles

Browsers give elements default styles. `button`, `input`, `h1`, `p`, etc. have layout-affecting defaults.

Open questions:

- Should the engine emulate any UA stylesheet?
- Should the design system be required to provide explicit sizing/layout?
- Should elements default to `display: block` or HTML-like defaults?

Recommended v1:

- Minimal deterministic defaults.
- Require explicit layout styles/classes for layout-sensitive tests.
- Do not attempt full UA stylesheet emulation.

### 6. Inline Layout

Inline layout is complex.

Open questions:

- Should nested text/inline elements be supported?
- Should `<span>` inside `<button>` affect button size?
- Should inline formatting be flattened?

Recommended v1:

- Treat text as leaf measurement only.
- For complex inline content, require explicit test layout metadata or wrapper blocks.

### 7. Text Measurement Accuracy

Pretext may cover much of this, but deterministic testing still needs a font policy.

Open questions:

- How are fonts resolved?
- What happens if the named font is unavailable?
- Is font weight measured meaningfully?
- Should unknown fonts fail?
- Should tests use one deterministic fake font?

Recommended v1:

- Use a deterministic fallback text measurer first.
- Add Pretext after the layout pipeline works.
- Standardize on known test fonts.
- Throw or warn on unsupported font features.

### 8. Replaced Elements

Images, SVGs, icons, canvas, video, and similar elements need intrinsic dimensions.

Open questions:

- How should image dimensions be known?
- Should SVG icons have default sizes?
- Should missing dimensions throw?

Recommended v1:

Use explicit metadata:

```html
<img data-layout-width="24" data-layout-height="24" />
```

or a resolver:

```ts
replacedElementSize(el): { width: number; height: number }
```

### 9. Portals

Modern UI libraries often render modals/dropdowns into portals.

Open questions:

- Should portal roots be treated as normal DOM descendants of `body`?
- How should logical component ownership interact with physical DOM order?
- How should z-index defaults work for portals?

Recommended v1:

- Use physical DOM order.
- Require explicit z-index on portal layers.
- Add tests for app-specific portal conventions.

### 10. Shadow DOM

Happy DOM supports parts of Shadow DOM, but layout traversal needs policy.

Open questions:

- Traverse shadow roots?
- Treat shadow root children as normal layout children?
- Handle slots?

Recommended v1:

- Ignore or explicitly reject Shadow DOM until needed.

### 11. Clipping

The current assumption says clipping may not be needed.

Open questions:

- Is `overflow: hidden` truly absent from layout-sensitive components?
- Are scroll containers used?
- Do dropdowns/tooltips interact with clipped parents?

Recommended v1:

- Mark clipping unsupported.
- Throw on `overflow: hidden | auto | scroll` if encountered in layout-sensitive subtree.
- Add clipping later if tests prove it is needed.

### 12. Scroll

Scrolling affects hit-testing.

Open questions:

- Should `scrollTop`/`scrollLeft` be supported?
- Should fixed positioning ignore scroll?
- Should elementFromPoint account for scroll containers?

Recommended v1:

- No scroll support.
- Fixed viewport.
- Throw on scroll-dependent layouts.

### 13. Transforms

Transforms affect visual position and hit-testing.

Open questions:

- Should `transform: translate(...)` be supported?
- Should scale/rotate be rejected?
- How does transformed geometry affect stacking and hit-testing?

Recommended v1:

- Reject all transforms.
- Add `translate()` only if absolutely needed.

### 14. Event Dispatch Realism

Having `elementFromPoint()` is not enough if `click()` ignores it.

Open questions:

- Should native `HTMLElement.click()` be patched?
- Should Testing Library `userEvent.click()` be wrapped?
- Should pointerdown/up/click sequences be simulated?

Recommended v1:

- Do not patch `HTMLElement.click()` globally.
- Provide `guardedClick()` / `expectReceivesPointer()` helpers.
- Later integrate with user-event if helpful.

### 15. Browser Parity Testing

The engine needs reality checks.

Open questions:

- Which browser should be the first parity target?
- Chromium only?
- Chromium + WebKit + Firefox?
- How many fixtures are enough?

Recommended v1:

- Use Playwright Chromium as the first browser parity target.
- Build a fixture corpus for supported CSS subset.
- Compare `getBoundingClientRect()`, `elementFromPoint()`, and `elementsFromPoint()`.

Example fixtures:

```txt
absolute-overlap
fixed-modal-backdrop
pointer-events-none
flex-row-gap
flex-column-center
grid-basic
text-wrap-button
portal-dropdown
z-index-dom-order
```

### 16. False Confidence

This is the largest product risk.

The engine can become dangerous if people assume passing tests mean browser correctness.

Mitigations:

- Loud project name and docs.
- Strict unsupported feature errors.
- Browser parity tests.
- Keep a small Playwright test suite for critical flows.
- Print useful errors when unsupported CSS is encountered.
- Avoid silent fallback behavior.

## Implementation Plan

### Phase 0: Package Skeleton and Harnesses

Start by shaping the repository as a package that can be published to npm later,
even if publishing is deferred.

- Package entry point and build config.
- Framework-agnostic core source layout.
- Vitest + happy-dom unit test harness.
- Playwright Chromium browser parity test harness.
- Benchmark harness.
- Local package scripts:
  - `pnpm test`
  - `pnpm test:browser-parity`
  - `pnpm bench`
  - `pnpm build`

The package core must not depend on Vitest, Playwright, React, Vue, Svelte, or
Testing Library. Those tools belong in tests or optional integration packages.

### Phase 1: Attachment Lifecycle

- Create `createLayoutEngine(config)`.
- Add explicit async `initialize()` for future Taffy/WASM setup.
- Add `attachTo(documentLike)`.
- Return a document-specific attachment object.
- Add `detach()` to restore patched DOM APIs.
- Store per-document state in `WeakMap<DocumentLike, LayoutState>`.

The exact API can evolve, but lifecycle boundaries should stay explicit.

### Phase 2: Document-Derived v0 Layout

Before integrating Taffy:

- Walk `document.body`.
- Parse a tiny supported CSS subset from inline styles and simple stylesheet
  rules.
- Support enough absolute/fixed positioning to create real hit-test fixtures.
- Throw on unsupported CSS by default.
- Apply the configurable unsupported CSS policy.
- Flatten boxes.
- Patch `getBoundingClientRect()`.

The v0 implementation should still be document-driven. Tests should not have to
register geometry manually.

### Phase 3: Hit Testing and Clickability

- Implement `elementFromPoint()`.
- Implement `elementsFromPoint()`.
- Implement z-index + DOM-order sorting.
- Add `pointer-events` and `visibility` filtering.
- Add `receivesPointerAtCenter(element)`.

### Phase 4: Browser Parity Tests

- Define small shared behavior fixtures.
- Apply the same fixture and interaction in Chromium and in happy-dom with the
  layout engine attached.
- Normalize results to selectors or ids.
- Compare only explicitly supported behavior.

Initial fixtures:

```txt
absolute-overlap
fixed-modal-backdrop
pointer-events-none
visibility-hidden
display-none
z-index-dom-order
elements-from-point-order
center-click-blocked-by-overlay
```

### Phase 5: Benchmarks

- Benchmark document traversal and style extraction.
- Benchmark `getBoundingClientRect()`.
- Benchmark `elementFromPoint()`.
- Benchmark `elementsFromPoint()`.
- Benchmark dirty/recompute behavior once invalidation exists.

Benchmarks should exist from the start so Taffy, text measurement, and CSS
parsing costs are visible as they are introduced.

### Phase 6: Taffy Layout

- Keep Taffy behind an adapter.
- Convert `TestStyle` to Taffy style.
- Build Taffy tree.
- Compute layout using fixed viewport.
- Flatten boxes.
- Extend browser parity fixtures to cover supported block/flex/grid behavior.

### Phase 7: Text Measurement

- Add deterministic rough text measurer.
- Add Pretext measurer behind interface.
- Support text leaf nodes.
- Add button/label/card fixtures.

### Phase 8: Developer Ergonomics

- `expectReceivesPointer(el)`.
- `expectBlockedBy(el, blocker)`.
- `guardedClick(el)`.
- Debug output for layout tree and hit boxes.

Example debug helper:

```ts
debugTestLayout()
```

Output:

```txt
body x=0 y=0 w=1280 h=720 z=0
  div#modal x=0 y=0 w=1280 h=720 z=50
  button#save x=100 y=100 w=120 h=40 z=10 BLOCKED_BY=div#modal
```

## Suggested Public API

```ts
const layoutEngine = createLayoutEngine({
  viewport: { width: 1280, height: 720 },
  unsupportedCss: {
    default: 'throw',
  },
  textMeasurer,
})

await layoutEngine.initialize()

const attachment = layoutEngine.attachTo(document)
```

```ts
attachment.recompute()
attachment.markDirty()
attachment.debug()
```

```ts
attachment.getBoundingClientRect(element)
attachment.elementFromPoint(x, y)
attachment.elementsFromPoint(x, y)
attachment.receivesPointerAtCenter(element)
```

The attachment may also patch DOM APIs so existing test code can call:

```ts
element.getBoundingClientRect()
document.elementFromPoint(x, y)
document.elementsFromPoint(x, y)
```

Optional test-framework helpers can be layered on later, but they should not be
required by the core package.

## Success Criteria

The project is successful if:

- Component tests can assert clickability/occlusion without Playwright.
- Common modal/dropdown/tooltip/header layering bugs are caught.
- Layout-sensitive tests remain fast enough to run with normal unit tests.
- Unsupported CSS fails loudly unless explicitly ignored by policy.
- A small browser parity suite shows parity with Chromium for the supported subset.
- Benchmarks make performance regressions visible from the start.
- The core package stays framework agnostic.
- The implementation remains much smaller and more deterministic than a browser.

The project is not successful if:

- It silently approximates unsupported CSS.
- It tries to emulate all browser behavior.
- It becomes slower or flakier than using Vitest Browser Mode.
- Teams start deleting all real browser tests because this exists.

## Summary

The idea is viable.

The useful product is:

```txt
happy-dom
+ framework-agnostic engine/attachment API
+ Taffy
+ Pretext
+ strict CSS subset resolver with configurable unsupported CSS policy
+ deterministic stacking model
+ custom hit-testing
+ browser parity fixtures
+ benchmarks
```

The key discipline is scope control. This should not try to become a browser. It should become a fast, deterministic, explicitly limited layout oracle for the UI patterns the application actually uses.
