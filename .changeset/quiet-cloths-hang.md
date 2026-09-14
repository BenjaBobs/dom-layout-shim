---
"dom-layout-shim": minor
---

Explain how to change the attached viewport when direct assignment is attempted.

Breaking before 1.0: assigning window.innerWidth or window.innerHeight now throws a TypeError with migration guidance, including in non-strict scripts where assignment could silently do nothing. Replace `window.innerWidth = 320` with `layoutEngine.setViewport({ width: 320, height: 640 })` to update layout and media queries together.
