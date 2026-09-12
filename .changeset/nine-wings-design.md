---
"dom-layout-shim": patch
---

Reuse layout and parsing work across geometry reads, scrolling, and stylesheet edits.

Repeated geometry and point queries now reuse cached validation state and hit-test ordering. For example, reading a row rectangle, setting its container scrollTop to 20, and reading again updates the row position without rebuilding flow layout or measuring its text again. Editing one stylesheet preserves parsed data for other sheets, and viewport changes reuse parsed CSS while selecting the applicable media rules.

Bounded caches reuse inline declaration parsing, selector expansion, and built-in text measurements. Injected textMeasurer implementations remain uncached. Synchronous DOM edits still invalidate geometry on the next read, and hosts whose CSSOM or scroll APIs cannot be intercepted retain conservative validation.
