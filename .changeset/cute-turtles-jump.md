---
"dom-layout-shim": patch
---

Resolve calculated dimensions for generated boxes and table-cell descendants before finalizing their containing layout. Percentage heights also recognize a definite height transferred from `aspect-ratio`.

For example, a 200px-wide table cell containing `width: calc(100% - 20px); aspect-ratio: 2` now gives the child a 180px width and 90px height and includes that height in the row. Previously the child could be corrected after the row was already sized. A generated flex item with `width: calc(50% - 10px)` now contributes its resolved width to the following item's position.
