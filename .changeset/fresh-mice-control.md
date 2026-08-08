---
'dom-layout-shim': minor
---

Add explicit deterministic native-control profile selection and per-control
metric overrides. The initial `portable` profile names and preserves the
package's existing intrinsic control geometry instead of deriving it from the
runtime host. Overrides can specialize one metric or replace the complete
profile.

```ts
await attachLayoutEngine({
  window,
  nativeControls: {
    profile: 'portable',
    overrides: { textInput: { width: 220 } },
  },
})

// An unstyled text input is 220×23 on Linux, macOS, and Windows:
// the width is overridden while the portable height remains in effect.
document.querySelector('input')?.getBoundingClientRect()
```
