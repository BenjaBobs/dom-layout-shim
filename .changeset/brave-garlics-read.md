---
"dom-layout-shim": patch
---

Honor important inline declarations.

Inline `style="display: none !important; display: block"` now produces a zero-sized rectangle and removes the element and its descendants from hit testing instead of leaving a visible layout box.
