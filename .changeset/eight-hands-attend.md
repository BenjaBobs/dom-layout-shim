---
'dom-layout-shim': patch
---
Use resolved padding consistently for layout, inline fragments, and resize observations.

For a block with `width:100px;height:80px;padding:10%;border:2px solid` inside
a 200px-wide parent, percentage padding now contributes 20px on every side.
Its content-box height remains 80px and its border-box height is 124px, instead
of losing the vertical padding. ResizeObserver reports the same content box,
and inline fragments start inside the resolved padding.

Grid items use their grid area's percentage basis. Nested, generated, and
positioned boxes, plus ordinary content inside table cells, share the corrected
layout measurements. Backend layout reads are cached until the next computation;
scroll-only projection reuses them.
