---
'dom-layout-shim': minor
---

Match structural and state pseudo-class styles and expose wrapped inline fragments through `getClientRects()`. After upgrading, `span.getClientRects()` returns one rectangle per wrapped line instead of an empty list, and rules such as `li:nth-child(2) { width: 40px }` affect deterministic layout.
