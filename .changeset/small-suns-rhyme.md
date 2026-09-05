---
'dom-layout-shim': minor
---

Size images, SVG, and canvas using intrinsic aspect ratios

Images now use natural dimensions supplied by the DOM host, SVG can derive its
ratio from a valid `viewBox`, and canvas uses its bitmap dimensions. A single CSS
width or height resolves the automatic axis from that ratio, including supported
min/max constraints and flex/grid placement. Image `load` and `error` events
invalidate cached geometry when resource dimensions change.

For example, a viewBox-only SVG with a CSS width previously retained the generic
150-pixel fallback height. It now has the expected 2:1 layout box:

```html
<svg id="icon" viewBox="0 0 200 100" style="width:100px;height:auto"></svg>
```

```ts
await attachLayoutEngine({ window })
const rect = window.document.querySelector('#icon').getBoundingClientRect()
console.log(rect.width, rect.height) // 100, 50 (previously 100, 150)
```

Image loading and decoding remain the DOM host's responsibility. SVG child
shapes and canvas pixels do not receive separate rendering or hit-test geometry.
