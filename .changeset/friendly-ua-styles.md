---
'dom-layout-shim': minor
---

Add configurable user-agent presentation styles below author CSS. Tests can now keep the deterministic portable baseline, disable it, or override selected defaults without duplicating reset CSS in every document.

```ts
// Before: the portable presentation defaults were always active.
await attachLayoutEngine({ window })

// After: disable them and define only the baseline this suite needs.
await attachLayoutEngine({
  window,
  userAgentStyles: {
    profile: 'none',
    overrides: 'p { margin: 0 }',
  },
})
```

User-agent overrides remain lower priority than document and inline styles. Structural HTML behavior and native-control intrinsic metrics remain independent.
