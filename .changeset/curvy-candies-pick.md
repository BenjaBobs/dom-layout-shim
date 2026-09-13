---
'dom-layout-shim': patch
---
Keep transformed hit regions and intersection observations inside ancestor overflow clips.

A 100px-wide child translated 80px right inside a 100px-wide `overflow: hidden`
parent now receives hits only in the visible 20px strip. Previously,
`elementFromPoint(150, 10)` could return that child outside the parent's clip.
Children translated into a clip are also hittable, and reflected ancestor clips
retain their own coordinate spaces.
