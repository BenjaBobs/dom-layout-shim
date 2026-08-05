---
"dom-layout-shim": minor
---

Answer `window.matchMedia()` queries from the configured layout viewport.

Previously, `matchMedia()` used the DOM environment's viewport, which could
disagree with the dimensions used by the layout engine:

```ts
await attachLayoutEngine({
  window,
  viewport: { width: 320, height: 640 },
})

// Previously: false when the DOM environment was wider than 500px
window.matchMedia('(max-width: 500px)').matches
```

It now evaluates the query against the configured 320px-wide layout viewport:

```ts
// Now: true
window.matchMedia('(max-width: 500px)').matches
```
