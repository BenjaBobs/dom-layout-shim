---
"dom-layout-shim": minor
---

Detach layout engines and inspect whether a window is attached.

Use `isLayoutEngineAttached(window)` to make shared setup idempotent. After `const attachment = await attachLayoutEngine({ window })`, call `attachment.detach()` to restore original DOM descriptors, viewport and media APIs, observers, and CSSOM hooks. `isLayoutEngineAttached(window)` then returns false, and native geometry methods work again.

Detach disconnects observers, cancels scheduled delivery, removes listeners, and clears caches. Repeated detach calls are safe; other windows stay attached. Detached attachment methods throw, and detaching an old handle cannot disconnect a replacement attachment.
