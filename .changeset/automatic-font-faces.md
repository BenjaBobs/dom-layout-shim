---
'dom-layout-shim': minor
---

Automatically discover initial `@font-face` rules and measure matching text from static TTF, OTF, or WOFF font data. For example, a data-URL font with custom glyph advances now determines an auto-sized button's width identically across happy-dom and Chromium, while unavailable families continue through deterministic fallback measurement. The obsolete `createPretextTextMeasurer()` export and Canvas-only Pretext dependency are removed.
