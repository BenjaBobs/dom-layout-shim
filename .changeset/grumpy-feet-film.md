---
'dom-layout-shim': patch
---
Lay out ordinary descendants inside table cells.

A `width: 100px; height: 40px` div inside a table cell now reports a 100×40px
rectangle instead of 0×0px and participates in point queries. Cells reuse block,
flex, grid, and styled inline layout, reflowing text at the allocated column
width. Top, middle, and bottom alignment place content within taller cells.
The existing limitations on full intrinsic table sizing remain.
