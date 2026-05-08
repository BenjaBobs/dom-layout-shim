# Implementation Phases

Each phase expands the set of browser behaviors that the engine handles and
locks the behavior with unit tests, browser parity fixtures, and benchmark
coverage where relevant.

## Phase 0: Package and Harness Foundation

Cases:

- Package entry point and build output.
- Window-level layout engine attachment lifecycle.
- DOM API patching and restoration.
- `offsetWidth`, `offsetHeight`, `clientWidth`, and `clientHeight` patching.
- Happy DOM unit tests.
- Chromium browser parity tests.
- Benchmark harness.

Status: implemented.

## Phase 1: Positioned Box Geometry

Cases:

- `position: relative` offsets.
- `position: absolute | fixed`.
- `left`, `right`, `top`, `bottom`, and `inset`.
- Explicit `width` and `height`.
- `min-width`, `min-height`, `max-width`, and `max-height`.
- Auto dimensions from opposing inset edges.
- `box-sizing`.
- Padding and border widths in `getBoundingClientRect()`.
- Minimal border-style handling so border widths match browser geometry.
- `display: none` zero rects.
- HTML `hidden` attribute zero rects.

Status: in progress. Relative offsets, absolute/fixed positioned boxes, and
min/max size constraints are implemented for the current v0 model.

## Phase 2: Hit Testing Surface

Cases:

- `elementFromPoint()`.
- `elementsFromPoint()`.
- `z-index` ordering.
- DOM-order tie breaking.
- `pointer-events: none`.
- `visibility: hidden`.
- Clickability at element center.
- Debug output for blocked elements.

Status: implemented for the current v0 positioned-box model.

## Phase 3: CSS Resolution and Policy

Cases:

- Lightning CSS-backed `<style>` parsing.
- Configured CSS text stylesheet parsing.
- Inline style parsing.
- Selector lists.
- Basic specificity for type, class, id, and universal selectors.
- Descendant and child selector combinators.
- Case-sensitive attribute selectors without namespaces.
- `:where()`, `:is()`, and `:not()` functional pseudo selectors.
- Source-order tie breaking for equal specificity.
- Explicit unsupported CSS policy.
- Unsupported selector/rule handling.

Status: partially implemented. Style resolution is based on configured CSS
text, inline styles, and real `<style>` rules. Class maps and utility-class
parsing are intentionally not implemented.

## Phase 4: Static Block Layout

Cases:

- Normal block flow.
- Parent/child vertical placement.
- Margins, padding, borders.
- Fixed containing block and simple absolute containing block behavior.
- Basic body/document defaults needed by fixtures.

Status: partially implemented. Static block flow, parent padding/border content
origins, margins without collapse, auto height from children, and absolute
containing blocks for positioned ancestors are supported. Browser UA defaults
are not implemented yet.

## Phase 5: Text and Intrinsic Sizing

Cases:

- Deterministic text measurement fallback.
- `line-height`.
- `white-space`.
- Button/label text leaf sizing.
- Replaced element metadata for images and SVGs.

Status: partially implemented. A deterministic text measurer is configurable,
the default measurer uses Pretext when canvas measurement is available and falls
back to deterministic measurement otherwise, text-only leaves can contribute to
auto height, positioned text-only leaves can use measured auto width/height, and
replaced elements can use width/height attributes or `data-layout-*` metadata.

## Phase 6: Taffy Pipeline

Cases:

- Taffy initialization behind engine lifecycle.
- Adapter-owned Taffy tree construction.
- Taffy-backed block layout.
- Flexbox.
- Grid subset.
- Gap and alignment properties supported by Taffy.
- Text and replaced element measurement through Taffy measure callbacks.
- Snapshot collection for DOM APIs and hit testing.

Status: in progress. The target architecture is documented in
`docs/taffy-pipeline-roadmap.md`. Taffy is now the default backend. The adapter
is the only active runtime layout path.

## Phase 7: Clipping and Scroll

Cases:

- `overflow: hidden` clipping.
- Scroll offsets.
- Fixed positioning versus scroll.
- Hit testing inside scroll containers.

Status: not started.

## Phase 8: Integration Ergonomics

Cases:

- Better debug reports.
- `expectReceivesPointer`.
- `expectBlockedBy`.
- `guardedClick`.
- Optional framework/test-library adapters as separate entry points.

Status: not started.
