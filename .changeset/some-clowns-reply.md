---
'dom-layout-shim': patch
---
Resolve nested calculated dimensions against consistent containing blocks.

A child with `width: calc(100% - 20px)` inside a 200px border box with 10px
padding on each side and 5px borders now resolves to 150px. Nested calculations
are resolved from outer contexts inward, including auto block widths.
Absolute descendants use their positioned containing block across static
ancestors instead of sizing against an intervening static element.
