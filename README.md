# test-layout

Deterministic layout and hit testing for fast DOM test harnesses.

This package is an early proof of concept. The core is framework agnostic and
attaches to DOM-like documents such as happy-dom documents. Layout is computed
through a Taffy-backed pipeline, with text measurement supplied through Pretext
when the runtime supports canvas measurement. DOM API patching and hit testing
are derived from the resulting layout snapshot.

```ts
import { attachLayoutEngine, expectReceivesPointer, guardedClick } from 'test-layout'

await attachLayoutEngine({
  window,
  viewport: { width: 1280, height: 720 },
  unsupportedCss: { default: 'throw' },
  stylesheets: [appLayoutCss],
})

const button = document.getElementById('save')!
const rect = button.getBoundingClientRect()
const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
const clickable = top === button || Boolean(top && button.contains(top))

expectReceivesPointer(button)
guardedClick(button)
```

The current implementation uses Lightning CSS for `<style>` parsing and supports
a small CSS subset for proof-of-concept block, flex, absolute, and fixed
positioned fixtures. Unsupported CSS throws by default unless explicitly ignored
by policy. Text measurement falls back to a deterministic approximation in
Node-like runtimes without canvas text measurement.

See [docs/css-support-status.html](docs/css-support-status.html) for a
filterable CSS support overview. The underlying source of truth is
[src/css/css-support-inventory.ts](src/css/css-support-inventory.ts).

See [docs/implementation-phases.md](docs/implementation-phases.md) for the
case-based implementation plan.

See [docs/taffy-pipeline-roadmap.md](docs/taffy-pipeline-roadmap.md) for the
Taffy pipeline contract and migration roadmap.
