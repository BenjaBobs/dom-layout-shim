---
"dom-layout-shim": patch
---

Expose scrollWidth and scrollHeight from cached layout.

A 100×60 container with overflow:auto and a 240×180 child now reports scrollWidth of 240 and scrollHeight of 180, instead of zero. The getters include padding and supported content overflow, exclude borders, respect nested clipping, and remain stable after scrolling. Descendant mutations update both values through the layout cache.
