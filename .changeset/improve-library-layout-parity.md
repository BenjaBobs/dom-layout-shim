---
'dom-layout-shim': minor
---

Improve component-library geometry and hit testing by measuring flex-styled button icons and gaps, resolving percentage insets, and containing descendant `z-index` values within nested positioned stacking contexts. For example, an icon button now includes the icon and `gap` in its intrinsic width, while a `z-index: 999` child no longer escapes a parent below a `z-index: 2` sibling.
