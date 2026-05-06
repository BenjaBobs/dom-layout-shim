# Supported CSS

This is the current proof-of-concept CSS contract. The parser accepts real CSS
syntax through Lightning CSS for `<style>` elements, but the layout engine only
supports the declarations listed here.

Unsupported CSS throws by default. Consumers can explicitly ignore selected
unsupported properties through `unsupportedCss`.

## Sources

Supported:

- Inline `style=""` declaration blocks.
- Configured CSS text through `createLayoutEngine({ stylesheets })`.
- `<style>` elements parsed with Lightning CSS.
- HTML `hidden` attributes as display suppression.
- Selector lists in `<style>` rules, for example `#one, #two`.
- Simple selectors and compound selectors using type, id, class, and universal
  selectors.
- Descendant and child selector combinators.
- Case-sensitive attribute selectors without namespaces.
- Functional pseudo selectors `:where()`, `:is()`, and `:not()` when their
  selector arguments are otherwise supported.
- Basic specificity ordering for type, class, and id selectors.
- Source-order tie breaking for selectors with equal specificity.

Unsupported:

- External stylesheets.
- `@media`, `@supports`, `@layer`, and other at-rules.
- Pseudo-elements and pseudo-classes other than `:where()`, `:is()`, and
  `:not()`.
- Sibling combinators.
- Namespaced attribute selectors and case-insensitive attribute selector flags.
- Full CSS cascade behavior.

Configured stylesheets are parsed before document `<style>` elements. This lets
shared application or design-system CSS establish the baseline while test-local
styles and inline declarations can still override it through normal specificity
and source order.

## Declarations

Supported values:

```txt
display: block | none
position: static | relative | absolute | fixed
box-sizing: content-box | border-box
margin: <px>{1,4}
margin-top/right/bottom/left: <px>
padding: <px>{1,4}
padding-top/right/bottom/left: <px>
border-style: none | solid
border-top/right/bottom/left-style: none | solid
border-width: <px>{1,4}
border-top/right/bottom/left-width: <px>
left: <px>
right: <px>
top: <px>
bottom: <px>
inset: <px>{1,4}
width: <px>
height: <px>
min-width: <px>
min-height: <px>
max-width: <px>
max-height: <px>
z-index: auto | <integer>
pointer-events: auto | none
visibility: visible | hidden
font-family: <family-list>
font-size: <px>
line-height: <px> | <number>
white-space: normal | pre-wrap | nowrap
```

Notes:

- `display: flex` and `display: grid` are parsed, but still unsupported by the
  layout engine.
- Elements with a present `hidden` attribute and their descendants receive zero
  rects and are excluded from hit testing.
- Lengths are currently pixels only, plus literal `0`.
- `inset` supports the normal 1-4 value shorthand, with pixel lengths only.
- `padding` and `border-width` support the normal 1-4 value shorthand, with
  pixel lengths only.
- `margin` supports the normal 1-4 value shorthand, with pixel lengths only.
- Margin collapse is not supported. Fixtures that rely on margins should avoid
  collapse-sensitive cases for now, for example by using parent padding/border.
- Border widths only affect geometry for edges with `border-style: solid`.
- `visibility: collapse` is unsupported.
- `pointer-events` is treated as a hit-testing property only.
- `box-sizing` affects explicit width/height and min/max size constraint rect
  math.
- `offsetWidth` and `offsetHeight` use the computed border box. `clientWidth`
  and `clientHeight` use the computed padding box.
- Static block layout is currently a narrow subset: block children stack
  vertically inside the parent content box and contribute to auto height.
- `position: relative` offsets the element's generated box and descendants,
  while preserving its normal-flow space.
- Absolutely positioned elements use the nearest positioned ancestor's padding
  box as their containing block. Fixed positioning remains viewport-relative.
- Text-only leaf elements contribute to auto height through a deterministic
  text measurer. This is intentionally not browser-font-accurate.
- Positioned text-only leaf elements can use text measurement for auto
  width/height.
- Replaced elements can use `width`/`height` attributes, or explicit
  `data-layout-width` and `data-layout-height` metadata, as intrinsic sizes.

## Unsupported Policy

Default behavior:

```ts
const engine = createLayoutEngine({
  unsupportedCss: {
    default: 'throw',
  },
})
```

Ignoring known-irrelevant declarations:

```ts
const engine = createLayoutEngine({
  unsupportedCss: {
    default: 'throw',
    properties: {
      transition: 'ignore',
      animation: 'ignore',
    },
  },
})
```

Custom properties can be ignored with a callback:

```ts
const engine = createLayoutEngine({
  unsupportedCss: {
    default: 'throw',
    property(property, context) {
      if (property.startsWith('--')) {
        return 'ignore'
      }

      return context.defaultDecision
    },
  },
})
```
