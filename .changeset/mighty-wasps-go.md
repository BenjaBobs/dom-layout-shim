---
"dom-layout-shim": minor
---

Collect unsupported CSS directly and merge reports across workers.

Pass `unsupportedCss: { reporter }` to attachLayoutEngine, query geometry, and read `reporter.getSummary()`. Explicit ignore/throw decisions still take precedence. Diagnostic values now use CSS text: an animation delay formerly reported as AST JSON is reported as `0.4s`, and selector entries contain the complete selector.

Use `mergeUnsupportedCssSummaries([firstSummary, secondSummary])` after transporting worker summaries as JSON. Matching entries merge their metadata and sum occurrences; two summaries of one identical unsupported declaration produce one combined declaration.
