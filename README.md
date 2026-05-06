# test-layout

Deterministic layout and hit testing for fast DOM test harnesses.

This package is an early proof of concept. The core is framework agnostic and
attaches to DOM-like documents such as happy-dom documents.

```ts
import { createLayoutEngine } from 'test-layout'

const layoutEngine = createLayoutEngine({
  viewport: { width: 1280, height: 720 },
  unsupportedCss: { default: 'throw' },
  stylesheets: [appLayoutCss],
})

await layoutEngine.initialize()
const attachment = layoutEngine.attachTo(document)

const button = document.getElementById('save')!
const clickable = attachment.receivesPointerAtCenter(button)
```

The current implementation uses Lightning CSS for `<style>` parsing and supports
a small CSS subset for proof-of-concept absolute and fixed-positioned fixtures.
Unsupported CSS throws by default unless explicitly ignored by policy.

See [docs/supported-css.md](docs/supported-css.md) for the current supported
CSS contract.

See [docs/implementation-phases.md](docs/implementation-phases.md) for the
case-based implementation plan.
