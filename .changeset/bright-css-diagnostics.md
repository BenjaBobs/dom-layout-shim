---
'dom-layout-shim': minor
---

Expand `createUnsupportedCssReporter()` summaries with occurrence counts, selectors, affected elements, and observed computed values. Consumers can now tell whether an unsupported declaration is repeatedly affecting a tracked element or is likely a superseded fallback:

```ts
const declaration = reporter.getSummary().declarations[0]
console.log(declaration.occurrences, declaration.elements, declaration.computedValues)
```
