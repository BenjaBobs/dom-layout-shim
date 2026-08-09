---
'dom-layout-shim': minor
---

Resolve CSS custom properties before parsing supported layout declarations.
Inherited values, local overrides, forward references, nested fallbacks, and
cyclic references now follow their CSS variable semantics, while values that
remain unresolved route through `unsupportedCss`.

Previously, a supported declaration such as `width: var(--card-width)` was
ignored as an unsupported value. After upgrading, it contributes layout:

```ts
document.body.innerHTML = `
  <main style="--card-width: 240px">
    <article id="card" style="width:var(--card-width)"></article>
  </main>
`

await attachLayoutEngine({ window })
document.querySelector('#card').offsetWidth // 240
```
