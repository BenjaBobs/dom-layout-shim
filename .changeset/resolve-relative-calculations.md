---
'dom-layout-shim': minor
---

Resolve `em`, `rem`, viewport units, custom properties, and reducible `calc()` expressions across supported layout declarations. For example, `width: calc(50vw - var(--gutter))` now contributes its computed pixel width instead of being ignored as unsupported CSS.
