---
"dom-layout-shim": minor
---

Support the :root pseudo-class in stylesheets.

Rules targeting :root now match the document element with pseudo-class specificity and supply inherited custom properties. For example, `:root { --panel-width: 80px; } .panel { width: var(--panel-width, 10px); }` now gives `.panel` elements an 80px width instead of the previous 10px fallback.
