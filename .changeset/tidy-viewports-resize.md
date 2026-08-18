---
'dom-layout-shim': minor
---

Return a layout attachment from `attachLayoutEngine()` with runtime viewport control. Tests can now attach once in shared setup and resize deterministic layout without rebuilding the DOM:

```ts
const layout = await attachLayoutEngine({ window })
layout.setViewport({ width: 390, height: 844 })
```

The new viewport updates layout, `innerWidth`, `innerHeight`, and subsequent `matchMedia()` results, and dispatches a window `resize` event.
