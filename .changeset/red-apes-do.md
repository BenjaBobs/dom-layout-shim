---
"dom-layout-shim": patch
---

Avoid serializing unchanged stylesheets on cached geometry reads.

Repeated calls such as `element.getBoundingClientRect()` now reuse per-sheet CSSOM revisions instead of serializing all document CSS on every read. For example, 200 reads after mounting a 300 KB stylesheet no longer repeat stylesheet serialization 200 times. Declaration edits such as `rule.style.width = "120px"`, rule insertion and replacement, and adopted-sheet reordering still invalidate cached geometry. Hosts with non-patchable CSSOM retain content fingerprinting.
