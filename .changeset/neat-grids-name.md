---
'dom-layout-shim': minor
---

Support rectangular named grid templates through `grid-template-areas` and
single-name `grid-area` placement. Named areas can span rows and columns and may
be arranged around unnamed `.` cells.

Previously, named templates were rejected as unsupported CSS. After upgrading,
items use the declared area bounds:

```ts
document.body.innerHTML = `
  <main style='display:grid; grid-template-columns:80px 120px;
    grid-template-areas:"nav content"'>
    <article id="content" style="grid-area:content"></article>
  </main>
`

await attachLayoutEngine({ window })
document.querySelector('#content').offsetLeft // 80
```
