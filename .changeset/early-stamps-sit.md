---
"dom-layout-shim": minor
---

Detach layout engines and inspect whether a window is attached.

Use `isLayoutEngineAttached(window)` to make shared setup idempotent. After `const layoutEngine = await attachLayoutEngine({ window })`, call `layoutEngine.detach()` to restore original DOM descriptors, viewport and media APIs, observers, and CSSOM hooks. `isLayoutEngineAttached(window)` then returns false, and native geometry methods work again.

Detach disconnects observers, cancels scheduled delivery, removes listeners, and clears caches. Repeated detach calls are safe; other windows stay attached. Detached layout engine methods throw, and detaching an old handle cannot disconnect a replacement layout engine.
