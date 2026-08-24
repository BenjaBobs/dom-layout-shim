---
'dom-layout-shim': minor
---

Lay out non-inline `::before` and `::after` generated content as independent anonymous boxes

Generated boxes now contribute their own dimensions and spacing in normal flow
and participate as flex or grid items instead of being flattened into the
originating element's text measurement.

```css
/* Before: these box dimensions and spacing were ignored. */
.card::before {
  content: '';
  display: block;
  height: 12px;
  margin-bottom: 3px;
}

/* After: ordinary .card content begins 15px after the box starts. */
```
