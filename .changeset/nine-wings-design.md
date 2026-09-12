---
"dom-layout-shim": patch
---

Reuse layout and parsing work across geometry reads, scrolling, and stylesheet edits.

Repeated geometry and point queries now reuse cached validation state and hit-test ordering. For example, reading a row rectangle, setting its container scrollTop to 20, and reading again updates the row position without rebuilding flow layout or measuring its text again. Editing one stylesheet preserves parsed data for other sheets, and viewport changes reuse parsed CSS while selecting the applicable media rules.

Bounded caches reuse inline declaration parsing, selector expansion, and built-in text measurements. Injected textMeasurer implementations remain uncached. Synchronous DOM edits still invalidate geometry on the next read, and hosts whose CSSOM or scroll APIs cannot be intercepted retain conservative validation.

Active layout passes retain expanded selectors even when a stylesheet exceeds the shared cache. For example, opening and closing an Ant Design modal no longer repeatedly expands its scoped selectors for every element; the example interaction tests complete substantially faster without increasing their timeout. These entries are released with the layout session.

Shared parsing and built-in text measurement caches now grow from 512 up to 4,096 entries when recently evicted inputs are reused. For example, repeatedly laying out 600 distinct labels can retain their built-in measurements after the cache grows, instead of continually evicting and recomputing them. Unique inputs alone do not grow the cache; oversized inputs remain uncached.
