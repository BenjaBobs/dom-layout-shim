---
'dom-layout-shim': patch
---
Apply browser defaults and HTML sizing hints through the shared CSS cascade.

A paragraph with `font-size:2em` inside a 30px parent now uses 60px, rather than
32px from the portable paragraph default. HTML hints such as `<img width="100">`
now beat normal user-agent width overrides while remaining overridable by
normal author CSS. Important user-agent rules retain their higher priority.

Authored `display:inline` on a non-replaced text container now uses the same
line fragments, dimensions, and hit testing as native phrasing elements. For
example, `<div style="display:inline">one two three</div>` joins its parent's
line layout instead of becoming a block. Inline elements and generated boxes
still become blocks when positioned absolutely/fixed or used as flex/grid items.
Atomic inline replaced elements and inline-block formatting remain unsupported.

Table properties also use normal inheritance. A caption with `caption-side: top`
overrides a table's `caption-side: bottom`; `empty-cells` can inherit through
row groups and rows before a cell's own declaration overrides it.
