---
'dom-layout-shim': patch
---

Replace the third-party Taffy 0.9.2 WebAssembly package with a repository-owned binding to Taffy 0.14.0

The upgrade removes obsolete compatibility handling:

- Percentage-track pre-scaling for the old JavaScript wrapper.
- Rewriting named grid areas to numeric line bounds.
- Blockifying `display: flow-root`.
- Excluding explicit and empty implicit `minmax()` row cases from verified
  Chromium parity.

For example, `display: flow-root` now establishes its independent formatting
context through Taffy, and `grid-area: header` reaches Taffy's named-area model
directly.
