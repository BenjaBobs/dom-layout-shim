---
'dom-layout-shim': patch
---

Make CSS support evidence explain the independently supported behaviors within
each topic. The exported inventory now provides descriptive, behavior-specific
claims instead of broad `current-supported-scope` entries, and its prose marks
CSS syntax and API names as inline code for documentation renderers.

```ts
const grid = cssSupportInventory.find((topic) => topic.id === 'grid-layout')

// Now identifies explicit tracks, auto flow, line placement, area placement,
// and shared placement behavior as separate claims with their own evidence.
grid?.claims.map((claim) => claim.id)
```

The CSS support explorer also separates implementation support from Chromium
verification, explains metadata with tooltips, groups dense claim sections,
and previews parity test sources without leaving the page.
