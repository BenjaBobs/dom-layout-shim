---
"dom-layout-shim": minor
---

Add an unsupported CSS reporter that reduces warning streams to a stable
adoption-cost summary across a test suite.

Previously, consumers had to build their own aggregation around `onWarning`:

```ts
const warnings = []

await attachLayoutEngine({
  window,
  unsupportedCss: {
    onWarning: (warning) => warnings.push(warning),
  },
})
```

The reporter now deduplicates declarations and exposes one headline count with
sorted diagnostic details:

```ts
const reporter = createUnsupportedCssReporter()

await attachLayoutEngine({
  window,
  unsupportedCss: { onWarning: reporter.onWarning },
})

const { unsupportedDeclarationCount, declarations } = reporter.getSummary()
```
