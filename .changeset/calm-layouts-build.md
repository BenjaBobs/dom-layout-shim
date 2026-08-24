---
'dom-layout-shim': patch
---

Replace the third-party Taffy 0.9.2 WebAssembly package with a
repository-owned binding to Taffy 0.14.0. The upgrade removes the old
percentage-track conversion, numeric named-area rewrite, and `flow-root`
blockification. For example, `display: flow-root` now establishes its native
independent formatting context, `grid-area: header` reaches Taffy's named-area
placement directly, and explicit or empty implicit `minmax()` rows match
Chromium in cases that diverged under 0.9.2.
