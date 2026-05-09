# Supported CSS

This is the current proof-of-concept CSS contract. The parser accepts real CSS
syntax through Lightning CSS for `<style>` elements, but the layout engine only
supports the declarations listed here.

Unsupported CSS throws by default. Consumers can explicitly ignore selected
unsupported properties through `unsupportedCss`.

## Sources

Supported:

- Inline `style=""` declaration blocks.
- Configured CSS text through `attachLayoutEngine({ stylesheets })`.
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
display: block | inline | inline-block | flow-root | list-item | flex | inline-flex | grid | inline-grid | none
flex-direction: row | row-reverse | column | column-reverse
flex-wrap: nowrap | wrap | wrap-reverse
flex-flow: <flex-direction> || <flex-wrap>
flex: none | auto | initial | <number> [<number>] [auto | <px>]
flex-grow: <number>
flex-shrink: <number>
flex-basis: auto | <px>
aspect-ratio: auto | <number> | <number> / <number>
grid-template-columns: none | (<px> | <percentage>)+
grid-template-rows: none | (<px> | <percentage>)+
grid-auto-columns: (<px> | <percentage>)+
grid-auto-rows: (<px> | <percentage>)+
grid-column: auto | <integer> [ / auto | <integer>]
grid-row: auto | <integer> [ / auto | <integer>]
grid-column-start/end: auto | <integer>
grid-row-start/end: auto | <integer>
align-content: start | end | flex-start | flex-end | center | stretch | space-between | space-around | space-evenly
align-items: start | end | flex-start | flex-end | center | stretch
align-self: auto | start | end | flex-start | flex-end | center | stretch
justify-content: start | end | flex-start | flex-end | center | space-between | space-around | space-evenly
justify-items: start | end | flex-start | flex-end | center | stretch
justify-self: auto | start | end | flex-start | flex-end | center | stretch
place-content: <align-content> [<justify-content>]
place-items: <align-items> [<justify-items>]
place-self: <align-self> [<justify-self>]
position: static | relative | absolute | fixed
box-sizing: content-box | border-box
margin: <px>{1,4}
margin-top/right/bottom/left: <px>
margin-inline/block: <px>{1,2}
margin-inline-start/end: <px>
margin-block-start/end: <px>
gap: <px>{1,2}
row-gap: <px> | normal
column-gap: <px> | normal
padding: <px>{1,4}
padding-top/right/bottom/left: <px>
padding-inline/block: <px>{1,2}
padding-inline-start/end: <px>
padding-block-start/end: <px>
border-style: none | solid
border-top/right/bottom/left-style: none | solid
border-inline/block-style: (none | solid){1,2}
border-inline-start/end-style: none | solid
border-block-start/end-style: none | solid
border-width: (<px> | thin | medium | thick){1,4}
border-top/right/bottom/left-width: <px> | thin | medium | thick
border-inline/block-width: (<px> | thin | medium | thick){1,2}
border-inline-start/end-width: <px> | thin | medium | thick
border-block-start/end-width: <px> | thin | medium | thick
border: [<px> | thin | medium | thick] [none | solid] [<color>]
border-top/right/bottom/left: [<px> | thin | medium | thick] [none | solid] [<color>]
border-color: <color>{1,4}
border-top/right/bottom/left-color: <color>
border-inline/block-color: <color>{1,2}
border-inline-start/end-color: <color>
border-block-start/end-color: <color>
left: <px> | auto
right: <px> | auto
top: <px> | auto
bottom: <px> | auto
inset: (<px> | auto){1,4}
inset-inline/block: (<px> | auto){1,2}
inset-inline-start/end: <px> | auto
inset-block-start/end: <px> | auto
width: <px> | <percentage> | auto
height: <px> | <percentage> | auto
inline-size: <px> | <percentage> | auto
block-size: <px> | <percentage> | auto
min-width: <px> | <percentage> | auto
min-height: <px> | <percentage> | auto
min-inline-size: <px> | <percentage> | auto
min-block-size: <px> | <percentage> | auto
max-width: <px> | <percentage> | none
max-height: <px> | <percentage> | none
max-inline-size: <px> | <percentage> | none
max-block-size: <px> | <percentage> | none
z-index: auto | <integer>
pointer-events: auto | none
visibility: visible | hidden
overflow: visible | hidden | clip
overflow-x: visible | hidden | clip
overflow-y: visible | hidden | clip
opacity: <number>
color: <color>
background-color: <color>
background: none | <color>
background-image: none
background-repeat: repeat | repeat-x | repeat-y | space | round | no-repeat
background-position: left | right | top | bottom | center | <px> | <percentage>
background-size: cover | contain | auto | <px> | <percentage>
background-origin: border-box | padding-box | content-box
background-clip: border-box | padding-box | content-box
background-attachment: scroll | fixed | local
box-shadow: none | [inset] <px> <px> [<px>] [<px>] [<color>]#
filter: none | <filter-function-list>
backdrop-filter: none | <filter-function-list>
text-decoration: <line> <style> <color> <thickness>
text-decoration-line: none | underline | overline | line-through | blink
text-decoration-color: <color>
text-decoration-style: solid | double | dotted | dashed | wavy
text-decoration-thickness: auto | from-font | <px> | <percentage>
transform-origin: left | right | top | bottom | center | <px> | <percentage>
will-change: auto | <ident-list>
appearance: auto | none
accent-color: auto | <color>
caret-color: auto | <color>
scroll-behavior: auto | smooth
scrollbar-width: auto | thin | none
scrollbar-color: auto | <color> <color>
overscroll-behavior: auto | contain | none
overscroll-behavior-x/y: auto | contain | none
isolation: auto | isolate
mix-blend-mode: normal | multiply | screen | overlay | darken | lighten | color-dodge | color-burn | hard-light | soft-light | difference | exclusion | hue | saturation | color | luminosity | plus-darker | plus-lighter
list-style: none | disc | circle | square | decimal | inside | outside
list-style-type: none | disc | circle | square | decimal
list-style-position: inside | outside
list-style-image: none
forced-color-adjust: auto | none | preserve-parent-color
color-scheme: normal | light | dark | only
border-radius: (<px> | <percentage>){1,4} [ / (<px> | <percentage>){1,4}]
border-top-left/top-right/bottom-right/bottom-left-radius: (<px> | <percentage>){1,2}
outline: [<px> | thin | medium | thick] [auto | none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset] [<color>]
outline-width: <px> | thin | medium | thick
outline-style: auto | none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset
outline-color: <color>
outline-offset: <px>
object-fit: fill | contain | cover | none | scale-down
object-position: left | right | top | bottom | center | <px> | <percentage>
cursor: <keyword>
user-select: auto | text | none | contain | all
touch-action: auto | none | manipulation | pan-x | pan-y | pan-left | pan-right | pan-up | pan-down | pinch-zoom
resize: none | both | horizontal | vertical | block | inline
--*: <tokens>
transition: <transition-list>
transition-property: <transition-property-list>
transition-duration: <time-list>
transition-timing-function: <timing-function-list>
transition-delay: <time-list>
transition-behavior: normal | allow-discrete
font-family: <family-list>
font-size: <px>
line-height: <px> | <number>
white-space: normal | pre-wrap | nowrap
```

Notes:

- `display: flex` uses Taffy's flexbox algorithm for row and column layout.
- `display: grid` supports explicit `grid-template-columns` and
  `grid-template-rows`, numeric `grid-column`/`grid-row` placement, and default
  auto-placement. Percentage tracks are supported. `fr`, `repeat()`, named
  lines, spans, and grid areas are not supported yet.
- `display: inline`, `inline-block`, `flow-root`, and `list-item` are
  blockified into this engine's block layout model. `inline-flex` and
  `inline-grid` are treated as `flex` and `grid`. Inline formatting and list
  marker layout are not modeled yet.
- Elements with a present `hidden` attribute and their descendants receive zero
  rects and are excluded from hit testing.
- Box dimensions support pixels, percentages, literal `0`, and reset values
  (`auto` for width/height/min-size, `none` for max-size).
- Insets support pixels, literal `0`, and `auto`.
- `inset` supports the normal 1-4 value shorthand.
- Logical sizing, spacing, inset, and border-edge declarations are mapped as
  default horizontal-tb LTR properties: inline start/end map to left/right and
  block start/end map to top/bottom. `direction` and `writing-mode` are not
  modeled yet.
- `padding` supports the normal 1-4 value shorthand, with pixel lengths only.
- `border-width` supports the normal 1-4 value shorthand, with pixel lengths
  and the browser keyword widths `thin`, `medium`, and `thick`.
- `margin` supports the normal 1-4 value shorthand, with pixel lengths only.
- `gap` supports the normal 1-2 value shorthand, with non-negative pixel
  lengths and `normal` computed as zero.
- Margin collapse is not supported. Fixtures that rely on margins should avoid
  collapse-sensitive cases for now, for example by using parent padding/border.
- Border widths only affect geometry for edges with `border-style: solid`.
- Border shorthands support layout-relevant width and style values. Border
  colors are parsed only enough to ignore them because they do not affect
  layout or hit testing.
- `visibility: collapse` is unsupported.
- `pointer-events` is treated as a hit-testing property only.
- `overflow: hidden` and `overflow: clip` clip descendant hit boxes to the
  element padding box for point queries. They do not change
  `getBoundingClientRect()` output.
- `opacity`, colors, border radii, box shadows, filters, text decoration,
  background drawing longhands, transform origins, `will-change`, and outlines
  are accepted as visual-only or inert properties. They do not affect layout or
  hit testing; this matches browser pointer targeting for transparent elements
  and visual effects drawn outside the border box.
- `object-fit`, `object-position`, `cursor`, `user-select`, `touch-action`,
  and `resize` are accepted as visual or interaction hints only. They do not
  affect computed rectangles or point queries.
- Appearance, color-scheme, scrollbar, overscroll, blending, list-style, and
  forced-color declarations are accepted as inert UI/paint metadata.
- Custom properties and transition declarations are accepted as inert
  declarations. Referencing a custom property from a supported layout property
  is still unsupported because this package does not implement variable
  resolution.
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
- Text-only leaf elements contribute to auto height through the configured text
  measurer. The default uses Pretext when canvas measurement is available and
  falls back to deterministic measurement otherwise.
- Positioned text-only leaf elements can use text measurement for auto
  width/height.
- Replaced elements can use `width`/`height` attributes, or explicit
  `data-layout-width` and `data-layout-height` metadata, as intrinsic sizes.

## Unsupported Policy

Default behavior:

```ts
await attachLayoutEngine({
  window,
  unsupportedCss: {
    default: 'throw',
  },
})
```

Ignoring known-irrelevant declarations:

```ts
await attachLayoutEngine({
  window,
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
await attachLayoutEngine({
  window,
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
