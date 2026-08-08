---
'dom-layout-shim': minor
---

Add explicit deterministic native-control profile selection. The initial
`portable` profile names and preserves the package's existing intrinsic control
geometry instead of deriving it from the runtime host.

```ts
await attachLayoutEngine({
  window,
  nativeControls: { profile: 'portable' },
})

// An unstyled text input is 192×23 on Linux, macOS, and Windows.
document.querySelector('input')?.getBoundingClientRect()
```
