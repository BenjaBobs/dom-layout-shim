---
'dom-layout-shim': minor
---

Include accessible linked stylesheets and constructable stylesheets in layout.
The engine now follows document and adoption order and automatically recomputes
geometry after CSSOM edits or changes to `document.adoptedStyleSheets`.

```ts
const sheet = new window.CSSStyleSheet()
sheet.replaceSync('.dialog { position: fixed; inset: 0 }')
window.document.adoptedStyleSheets = [sheet]

await attachLayoutEngine({ window })

// Now covers the configured viewport; previously this sheet was ignored.
dialog.getBoundingClientRect()
```
