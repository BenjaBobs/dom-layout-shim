---
'dom-layout-shim': minor
---

Apply inherited `text-transform` values during intrinsic text measurement. For example, a button styled with `text-transform: uppercase` now sizes from `ADD TASK` while its authored `textContent` remains `Add task`; custom text measurers receive the transformed string too.
