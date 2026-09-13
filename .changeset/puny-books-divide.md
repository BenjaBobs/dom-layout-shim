---
'dom-layout-shim': patch
---
Unify inline and stylesheet declaration parsing and cascade resolution.

A stylesheet `width: 100px !important` now beats normal inline `width: 200px`,
instead of producing 200px. Both `width: 2em; font-size: 30px` and the reversed
order now produce 60px; previously the first order produced 32px.

Quoted semicolons in inline values are parsed as CSS tokens. Generated content
such as `::before { --label: "Hello"; content: var(--label) }` now resolves the
pseudo-element's custom properties through the same cascade as its other styles.
Inline values receive the same parser normalization as stylesheet declarations.
