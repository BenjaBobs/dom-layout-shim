---
"dom-layout-shim": patch
---

Report stylesheet rules discarded during parser recovery.

For example, stylesheets containing `div: { width: 20px }` now report an unsupported-rule entry for `stylesheet` with the authored CSS when layout is queried. Previously the reporter could remain empty. Strict-policy errors and warning callback errors now propagate unchanged.
