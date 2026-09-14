---
'dom-layout-shim': patch
---
Share styled inline layout across text measurement, fragments, and point queries.

A 30px block followed by bare `Hello` in a container with `line-height: 20px`
now contributes 50px of height instead of 30px. Nested inline font settings and
inline pseudo-element typography now participate in measurement, and inline
fragments are hittable through `elementFromPoint()`.

Default and font-backed measurement share whitespace and wrapping rules;
`pre-wrap` and `pre-line` wrap at available width. Preserved breaking spaces and
hard breaks produce their own client fragments. Absolute descendants of static
ancestors also retain their containing-block origin when text adds flow height.

Inline offset sizes now span the fragment union and offset positions use the
first fragment; client dimensions remain zero. For example, a span wrapping
across three 30px lines with a 20px em box has an 80px `offsetHeight`, rather
than the last fragment's 20px. Positioned overlays remain above ordinary inline
text, while in-flow descendants paint above their container's background.
