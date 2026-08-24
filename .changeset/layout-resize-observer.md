---
'dom-layout-shim': minor
---

Add a deterministic, layout-backed ResizeObserver

Attached windows now report element size changes through the standard
`ResizeObserver` API. Delivery is automatic by default and remains lazy when
there are no active observations. Tests can opt into explicit delivery:

```ts
const layout = await attachLayoutEngine({
  window,
  observers: { delivery: 'manual' },
})
const observer = new window.ResizeObserver(entries => {
  console.log(entries[0].contentRect.width)
})
observer.observe(element)

element.style.width = '320px'
layout.flushLayout() // callback reports 320
```
