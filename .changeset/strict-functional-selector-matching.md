---
'dom-layout-shim': patch
---

Prevent scoped compound `:where()` and `:is()` selectors from matching unrelated elements when the host DOM implements functional selector matching incorrectly. CSS-in-JS rules now remain scoped to their intended components instead of corrupting surrounding layout.

```css
/* Before: some DOM harnesses incorrectly applied this rule to unrelated elements. */
:where(.library-scope).input:not(.success) { border-width: 1px }

/* After: only elements matching both .library-scope and .input receive it. */
```
