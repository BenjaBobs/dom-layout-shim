---
"dom-layout-shim": minor
---

Support intrinsic grid tracks and box sizes.

For example, `grid-auto-flow: column; grid-auto-columns: max-content` now gives implicit columns their individual content widths instead of falling back to evenly split tracks. Explicit and implicit tracks also accept `auto`, `min-content`, and `fit-content(90px)` (including percentage limits).

`width: max-content` now sizes a box to its unwrapped content; `width: fit-content` clamps its width to the available space between its minimum and maximum content sizes. These keywords also work for height and logical preferred sizes. Intrinsic min/max dimension constraints remain unsupported.
