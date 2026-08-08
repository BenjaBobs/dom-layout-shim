---
'dom-layout-shim': minor
---

Support `position: sticky` for physical insets, scrolling ancestors, viewport
scrolling, containing-block limits, hit testing, and simple table headers.

```ts
scroller.scrollTop = 50

// Now remains at the scroller's top inset; previously `sticky` was rejected.
toolbar.getBoundingClientRect().top
```
