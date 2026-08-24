---
'dom-layout-shim': minor
---

Add a deterministic, layout-backed IntersectionObserver

Attached windows now report viewport and element-root intersections using the
shim's geometry, including root margins and threshold crossings. It shares the
automatic or manual delivery mode used by other layout observers:

```ts
const layout = await attachLayoutEngine({
  window,
  observers: { delivery: 'manual' },
})
const observer = new window.IntersectionObserver(entries => {
  console.log(entries[0].intersectionRatio)
}, { threshold: [0, 0.5, 1] })
observer.observe(element)

layout.flushLayout()
```
