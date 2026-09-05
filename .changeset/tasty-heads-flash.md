---
'dom-layout-shim': minor
---

Measure inherited CSS word spacing

`word-spacing` now affects intrinsic text widths and normal line wrapping instead
of being reported as unsupported. Positive and negative supported lengths,
`normal`, and inherited values feed both font-backed and fallback measurement.
Custom text measurers receive the resolved value as `input.wordSpacing`.

For example, after attaching the engine, changing a text leaf from
`word-spacing: normal` to `word-spacing: 4px` adds four pixels per remaining space:

```ts
const layout = await attachLayoutEngine({ window })
element.textContent = 'one two'
element.style.cssText = 'display:flex;position:absolute;white-space:nowrap'
const before = element.getBoundingClientRect().width

element.style.wordSpacing = '4px'
layout.flushLayout()
console.log(element.getBoundingClientRect().width - before) // 4
```

Space and no-break-space advances are supported within the existing whitespace
model; script-specific word separators remain outside the supported subset.
