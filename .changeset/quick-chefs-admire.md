---
"dom-layout-shim": minor
---

Name the public layout engine handle LayoutEngine.

Breaking before 1.0: replace type imports of `LayoutEngineAttachment` with `LayoutEngine`. For example, use `const layoutEngine: LayoutEngine = await attachLayoutEngine({ window })`, then `layoutEngine.setViewport({ width: 320, height: 640 })` or `layoutEngine.detach()`. Runtime methods retain their behavior; diagnostics and examples now consistently call the handle a layout engine.
