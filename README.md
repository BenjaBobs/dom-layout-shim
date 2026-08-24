# DOM Layout Shim

Deterministic layout and hit testing for fast DOM test harnesses.

This package is an early proof of concept. The core is framework agnostic and
attaches to DOM-like documents such as happy-dom documents. Layout is computed
through a Taffy-backed pipeline. At attachment time it discovers supported
`@font-face` rules and measures text directly from their font data, with a
deterministic approximation for unmatched families. DOM API patching and hit
testing are derived from the resulting layout snapshot.

## Installation

```sh
pnpm add dom-layout-shim
```

DOM Layout Shim works with the DOM environment already owned by your test
harness. It does not install or require a particular DOM implementation.

## Quick start

```ts
import { attachLayoutEngine } from 'dom-layout-shim'

await attachLayoutEngine({ window })

const button = document.getElementById('save')!
const rect = button.getBoundingClientRect()
const target = document.elementFromPoint(
  rect.left + rect.width / 2,
  rect.top + rect.height / 2,
)
```

The attachment patches `getBoundingClientRect()`, `getClientRects()`, `offsetWidth`,
`offsetHeight`, `offsetTop`, `offsetLeft`, `offsetParent`, `clientWidth`, and
`clientHeight` from the same layout snapshot, so geometry APIs agree with hit
testing.

Wrapped inline phrasing elements expose one `DOMRect` per line through
`getClientRects()`, while `getBoundingClientRect()` returns their union. Stylesheet
matching supports `:first-child`, `:nth-child()`, `:last-child`, `:hover`,
`:focus`, and `:disabled` in addition to the existing selector forms.

The default viewport is 1280×720. Inline styles and document `<style>` elements
are discovered automatically. Accessible `<link rel="stylesheet">` sheets and
constructable sheets in `document.adoptedStyleSheets` also participate in their
CSS cascade order. Changes to their rules, membership, or ordering invalidate
the cached layout automatically. Configuration is only needed to override a
default or supply additional stylesheet text:

```ts
await attachLayoutEngine({
  window,
  viewport: { width: 1440, height: 900 },
  stylesheets: [appLayoutCss],
})
```

The deterministic `portable` user-agent style profile supplies the package's
narrow baseline for headings, paragraphs, lists, and controls. Disable that
presentation layer or specialize it with CSS at the user-agent cascade origin:

```ts
await attachLayoutEngine({
  window,
  userAgentStyles: {
    profile: 'portable', // Or 'none' for no presentation defaults.
    overrides: 'p { margin: 0 } button { font: inherit }',
  },
})
```

Overrides are lower priority than document and inline styles. Structural HTML
behavior, such as hidden inputs not generating boxes, is not disabled by
`profile: 'none'`. Native-control intrinsic sizes are configured separately
with `nativeControls`.

The engine currently uses `html` and `body` as its synthetic viewport
containing block rather than independent boxes, so profile overrides do not yet
model their own margins, padding, or geometry.

`attachLayoutEngine()` returns the active attachment. Change its viewport
without rebuilding the DOM when a test exercises responsive behavior:

```ts
const layout = await attachLayoutEngine({ window })

layout.setViewport({ width: 390, height: 844 })
// Layout, innerWidth/innerHeight, and matchMedia() now use the mobile viewport.
```

Changing the viewport invalidates cached geometry and dispatches a `resize`
event on the attached window.

External sheets whose `cssRules` cannot be read, including cross-origin sheets,
are routed through the unsupported CSS policy. The default policy warns and
continues; strict mode throws instead of silently computing layout without the
sheet.

Custom properties in inline and document styles resolve before supported
layout values are parsed. Values inherit through the element tree, local
declarations override inherited values, and nested fallbacks recover missing or
cyclic references:

```ts
window.document.body.innerHTML = `
  <main style="--card-width: 288px">
    <article style="width:var(--card-width); padding:var(--space, 12px)"></article>
  </main>
`

await attachLayoutEngine({ window })

// The article is 288px wide with 12px fallback padding.
window.document.querySelector('article')?.getBoundingClientRect()
```

If a reference remains unresolved, the declaration follows the configured
unsupported CSS policy rather than contributing an incorrect layout value.

The attachment also answers `window.matchMedia()` from that configured
viewport. It supports screen/all media types, width and height constraints,
orientation, aspect ratio, query lists, and `not`/`and` combinations.
Non-viewport media features that the deterministic configuration does not
define evaluate to false.

Stylesheet `@media` rules use the same configured viewport, so responsive
layout branches agree with `matchMedia()` instead of using the DOM host's
window size. Matching supports screen/all media types, width and height ranges,
orientation, aspect ratio, query lists, conjunctions, and nested media rules.
Unsupported media features route through the unsupported CSS policy.

Calling `element.scrollIntoView()` scrolls layout-backed ancestors and the
configured viewport. Boolean arguments and `block`/`inline` alignment options
are supported. Smooth behavior completes immediately so subsequent test
assertions remain deterministic.

The current implementation uses Lightning CSS for `<style>` parsing and supports
a small CSS subset for proof-of-concept block, flex, absolute, fixed, and sticky
positioned fixtures. Sticky boxes honor physical insets against the nearest
supported scrolling ancestor or the viewport, including sticky table headers,
and stop at their containing block. Grid layouts support rectangular named
templates through `grid-template-areas` and `grid-area`, including areas that
span rows or columns and templates with unnamed `.` cells. Unsupported declarations are ignored with deduplicated
warnings so applications can continue using the supported subset. Each warning
identifies the declaration and links to its compatibility entry.

Supported layout lengths include pixels, percentages where documented, `em`,
`rem`, and viewport units. `calc()` expressions and custom-property references
are evaluated when they reduce to one supported length, percentage, or number.
Mixed percentage-and-pixel dimensions such as `calc(100% - 32px)` resolve when
their containing-block axis is definite. Styled flex buttons include inline
icons, gaps, padding, and borders in deterministic intrinsic sizing. Nested
positioned stacking contexts constrain descendant `z-index` values during point
queries.
The exported `HitBox` diagnostic type exposes the optional `stackingOrder`
paint key used to compare nested contexts.
Two-dimensional rotation, skew, and matrix transforms affect client geometry
and use polygonal hit regions rather than treating the empty corners of a
transformed bounding rectangle as clickable.
Text measurement receives inherited numeric `font-weight` and resolved
`letter-spacing` in addition to family, size, line height, and white-space.
Static TTF, OTF, and WOFF sources declared through `@font-face` are loaded at
attachment time and their glyph advances and kerning drive text measurement.
Data URLs and resolvable URL sources are supported; `local()` and WOFF2 sources
fall through to the next source or deterministic measurement.
Supported `text-transform` values (`none`, `uppercase`, `lowercase`, and
`capitalize`) transform the string passed to intrinsic measurement without
changing the element's authored `textContent`.
Inline phrasing runs alongside block children contribute anonymous line boxes
to their shared container instead of disappearing from its intrinsic height.
Generated strings and `attr()` values from `::before` and `::after` contribute
to intrinsic text measurement. Non-inline generated content also creates an
anonymous layout box with its own dimensions and spacing, including when the
originating element is a flex or grid container. For example, a block
`::before` with `height: 12px` and `margin-bottom: 3px` contributes 15px before
the originating element's ordinary content. Supported state, functional, and
case-insensitive attribute selectors participate in stylesheet matching.

Use a callback to display or collect warnings in the test runner:

```ts
await attachLayoutEngine({
  window,
  unsupportedCss: {
    onWarning: ({ property, value, reason }) => {
      testLogger.warn(`${property}: ${value} (${reason})`)
    },
  },
})
```

To reduce a warning stream to one adoption-cost number for a test suite, reuse
an unsupported CSS reporter across its attachments:

```ts
import {
  attachLayoutEngine,
  createUnsupportedCssReporter,
} from 'dom-layout-shim'

const reporter = createUnsupportedCssReporter()

await attachLayoutEngine({
  window,
  unsupportedCss: { onWarning: reporter.onWarning },
})

const summary = reporter.getSummary()
console.log(summary.unsupportedDeclarationCount)
```

The count represents unique unsupported combinations of property, value, and
reason. `summary.declarations` contains stable, sorted details, occurrence
counts, source and selector types, affected elements, and the browser-like
computed values observed when the warning was collected. These extra fields
help separate active layout inputs from repeated or superseded fallback rules.
Call `reporter.reset()` between independent suites.

Set `unsupportedCss.default` to `'throw'` for strict CI enforcement or
`'ignore'` to deliberately suppress unsupported declarations. Decisions can
also be overridden by property. Text measurement falls back to a deterministic
approximation in Node-like runtimes without canvas text measurement.

Native-control intrinsic geometry uses the deterministic `portable` profile by
default. Select it explicitly when a test wants to document that target rather
than follow the machine running the test:

```ts
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

// 220×23: the overridden width plus the profile's unchanged height.
document.querySelector('input')?.getBoundingClientRect()
```

Overrides are merged by control group and by metric. Override only the values a
test environment needs to specialize, or provide every field in every group to
define a fully custom profile. The exported `NativeControlMetrics` and
`NativeControlOverrides` types describe the complete shape.

Native-control profiles emulate outer geometry, not operating-system rendering
or internal widget behavior. Additional Chromium platform profiles are added
only from recorded cross-platform parity evidence.

The package requires Node.js 22 or newer and uses standard ES modules.

See the [documentation site](https://benjabobs.github.io/dom-layout-shim/) and
its [filterable CSS support overview](https://benjabobs.github.io/dom-layout-shim/css-support-status.html).
The site also hosts matching [Material UI and Ant Design task-workspace examples](https://benjabobs.github.io/dom-layout-shim/examples.html),
whose happy-dom tests exercise geometry, portals, overlays, scrolling, and hit
testing through the public API.
The underlying source of truth is
the machine-readable records in [support/css](support/css). Each record follows
[support/css-support.schema.json](support/css-support.schema.json). Topics are
divided into behavior-specific claims so support level, Chromium evidence,
conditions, and limitations remain scoped to the behavior they describe. The
explorer can preview each linked parity fixture locally or open its source on
GitHub. Run
`pnpm run css:validate` to check the inventory, `pnpm run css:generate` after
editing it, or `pnpm run css:query -- flex-basis` to query it from a terminal.
Ignored documentation-site output, including generated CSS support JSON, is
written to `.site/`.

Run `pnpm run docs:generate` to rebuild the ignored `.site/` deployment output,
or `pnpm run docs:check` to validate and regenerate it. Run
`pnpm run docs:serve` to generate and serve the complete documentation site
locally. Pass a port when needed, for example
`pnpm run docs:serve -- 4174`.

Run `pnpm run examples:check` to build, typecheck, and test every example app.
Run `pnpm run examples:compatibility` to produce non-gating Chromium-versus-shim
interaction reports for the UI-library examples. Layout differences are
recorded for inspection; only an execution or capture error fails the command.

Run `pnpm run test:package` to build and pack the exact npm artifact, install it
into an isolated consumer project, typecheck its public API, and exercise layout
and hit testing through the packaged output.

See [docs/implementation-phases.md](docs/implementation-phases.md) for the
case-based implementation plan.

See [docs/taffy-pipeline-roadmap.md](docs/taffy-pipeline-roadmap.md) for the
Taffy pipeline contract and migration roadmap.

See [docs/releasing.md](docs/releasing.md) for the changeset, changelog, and
pre-1.0 versioning policy.

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
User-facing changes include a Changeset so their release impact is explicit.

See [SUPPORT.md](SUPPORT.md) for issue guidance,
[SECURITY.md](SECURITY.md) for private vulnerability reporting, and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for participation expectations.

## Commit convention

Use `<type>(<scope>): <imperative summary>` for commit subjects. A scope is
required for every commit.

Allowed types:

- `feat`: add supported behavior or a public capability
- `fix`: correct existing behavior
- `test`: change tests without changing intended package behavior
- `refactor`: restructure code without an intended behavior change
- `docs`: change documentation only
- `perf`: improve performance

Allowed scopes:

- `css`: CSS parsing, layout behavior, hit testing, and browser parity
- `api`: the public API surface for package consumers
- `cfg`: dependencies, package metadata, build scripts, and tooling

Choose the type based on the effect of the change. For example, a dependency
update may be `feat(cfg)`, `fix(cfg)`, or `refactor(cfg)` depending on why it is
being made.

Keep the subject imperative and under 72 characters. Both uppercase and
lowercase letters are allowed. Keep commit bodies short and omit them when the
subject is sufficient. Use a body when it explains non-obvious reasoning or
provides a useful enumeration of changes. Commit bodies may use Markdown.
When applicable, include a minimal code example that makes the changed CSS,
API, or configuration behavior easy to see. Prefer a focused usage example
over reproducing implementation details or a large part of the diff. Add a
short code comment when it helps identify the newly supported or changed part
of the example.

For example, a parity commit covering several distinct behaviors should
enumerate them:

```text
test(css): Expand grid and aspect-ratio parity coverage

- Cover grid track content alignment
- Cover grid item stretching and self-alignment
- Cover inverse and constrained aspect-ratio sizing
```

For example, a commit adding CSS behavior may show the newly supported form:

````text
feat(css): Support percentage row gaps

```css
.items {
  display: flex;
  flex-wrap: wrap;
  height: 100px;
  row-gap: 10%; /* Percentage row gaps are now supported. */
}
```
````

If a change genuinely requires another scope, add that scope to the list above
in the same change. Do not introduce unlisted scopes only in commit subjects.

Agents may create focused commits for their own changes after relevant checks
pass. They must preserve unrelated changes, exclude generated output, and must
not amend existing commits or push unless explicitly requested.

## License

DOM Layout Shim is released into the public domain under
[the Unlicense](LICENSE). You may use, copy, modify, publish, compile, sell, or
distribute the software for any commercial or non-commercial purpose.
