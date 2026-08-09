---
'dom-layout-shim': minor
---

Apply responsive stylesheet `@media` rules against the viewport configured for
the layout engine. Media types, dimensions, orientation, aspect ratio, query
lists, conjunctions, and nested rules now select the same branches as Chromium.

Previously, media rules were rejected by the unsupported CSS policy. After
upgrading, matching rules contribute layout:

```ts
document.head.innerHTML = `
  <style>@media (max-width: 600px) { #panel { width: 100px } }</style>
`
document.body.innerHTML = '<div id="panel"></div>'

await attachLayoutEngine({ window, viewport: { width: 480, height: 800 } })
document.querySelector('#panel').offsetWidth // 100
```
