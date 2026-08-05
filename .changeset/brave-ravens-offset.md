---
"dom-layout-shim": minor
---

Patch `offsetTop`, `offsetLeft`, and `offsetParent` from the layout snapshot.

Previously, these properties came from the host DOM implementation and could
disagree with the engine's geometry:

```ts
element.offsetTop
element.offsetLeft
element.offsetParent
```

They now describe the element relative to its layout-backed CSS offset parent,
including positioned ancestors, borders, margins, and scrolling.
