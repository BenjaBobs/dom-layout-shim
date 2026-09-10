---
"dom-layout-shim": patch
---

Apply native CSS nesting in stylesheets.

Nested declarations now affect layout instead of being discarded. For example, `.card { .item { width: 60px; } }` now gives a matching child a `getBoundingClientRect().width` of 60, where previously the nested width was ignored. Parent selector-list specificity, declarations after nested rules, and nested viewport media queries are preserved.
