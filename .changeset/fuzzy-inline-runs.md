---
'dom-layout-shim': minor
---

Include inline phrasing runs in containers that also have block children. For example, `<div><h2>Title</h2><span>Details</span></div>` now includes the `Details` line in the container's intrinsic height and exposes the span's client geometry instead of dropping that inline run from layout.
