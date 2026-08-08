---
'dom-layout-shim': minor
---

Support two-dimensional translation and scaling through both `transform`
functions and the individual `translate` and `scale` properties. Percentage
values, transform origins, ordered function lists, transformed descendants,
client rectangles, and point queries are included.

```css
/* Transform functions are now reflected in geometry and hit testing. */
.dialog {
  transform: translate(20px, 10px) scale(1.25);
  transform-origin: left top;
}

/* The equivalent individual properties are also supported. */
.popover {
  translate: 50% 8px;
  scale: 1.25;
}
```

Layout flow and offset/client dimensions remain untransformed, matching browser
behavior.
