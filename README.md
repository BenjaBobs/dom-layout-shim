# test-layout

Deterministic layout and hit testing for fast DOM test harnesses.

This package is an early proof of concept. The core is framework agnostic and
attaches to DOM-like documents such as happy-dom documents.

```ts
import { attachLayoutEngine } from 'test-layout'

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
```

The current implementation uses Lightning CSS for `<style>` parsing and supports
a small CSS subset for proof-of-concept absolute and fixed-positioned fixtures.
Unsupported CSS throws by default unless explicitly ignored by policy.

See [docs/supported-css.md](docs/supported-css.md) for the current supported
CSS contract.

See [docs/implementation-phases.md](docs/implementation-phases.md) for the
case-based implementation plan.
