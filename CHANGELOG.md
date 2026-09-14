# dom-layout-shim

## 0.10.0

### Minor Changes

- 60d3b27: Detach layout engines and inspect whether a window is attached.
  
  Use `isLayoutEngineAttached(window)` to make shared setup idempotent. After `const layoutEngine = await attachLayoutEngine({ window })`, call `layoutEngine.detach()` to restore original DOM descriptors, viewport and media APIs, observers, and CSSOM hooks. `isLayoutEngineAttached(window)` then returns false, and native geometry methods work again.
  
  Detach disconnects observers, cancels scheduled delivery, removes listeners, and clears caches. Repeated detach calls are safe; other windows stay attached. Detached layout engine methods throw, and detaching an old handle cannot disconnect a replacement layout engine.
- 94af943: Collect unsupported CSS directly and merge reports across workers.
  
  Pass `unsupportedCss: { reporter }` to attachLayoutEngine, query geometry, and read `reporter.getSummary()`. Explicit ignore/throw decisions still take precedence. Diagnostic values now use CSS text: an animation delay formerly reported as AST JSON is reported as `0.4s`, and selector entries contain the complete selector.
  
  Use `mergeUnsupportedCssSummaries([firstSummary, secondSummary])` after transporting worker summaries as JSON. Matching entries merge their metadata and sum occurrences; two summaries of one identical unsupported declaration produce one combined declaration.
- b00d997: Name the public layout engine handle LayoutEngine.
  
  Breaking before 1.0: replace type imports of `LayoutEngineAttachment` with `LayoutEngine`. For example, use `const layoutEngine: LayoutEngine = await attachLayoutEngine({ window })`, then `layoutEngine.setViewport({ width: 320, height: 640 })` or `layoutEngine.detach()`. Runtime methods retain their behavior; diagnostics and examples now consistently call the handle a layout engine.
- 4324410: Explain how to change the attached viewport when direct assignment is attempted.
  
  Breaking before 1.0: assigning window.innerWidth or window.innerHeight now throws a TypeError with migration guidance, including in non-strict scripts where assignment could silently do nothing. Replace `window.innerWidth = 320` with `layoutEngine.setViewport({ width: 320, height: 640 })` to update layout and media queries together.

### Patch Changes

- 857b090: Keep transformed hit regions and intersection observations inside ancestor overflow clips.
  
  A 100px-wide child translated 80px right inside a 100px-wide `overflow: hidden`
  parent now receives hits only in the visible 20px strip. Previously,
  `elementFromPoint(150, 10)` could return that child outside the parent's clip.
  Children translated into a clip are also hittable, and reflected ancestor clips
  retain their own coordinate spaces.
- 051355d: Resolve calculated dimensions for generated boxes and table-cell descendants before finalizing their containing layout. Percentage heights also recognize a definite height transferred from `aspect-ratio`.
  
  For example, a 200px-wide table cell containing `width: calc(100% - 20px); aspect-ratio: 2` now gives the child a 180px width and 90px height and includes that height in the row. Previously the child could be corrected after the row was already sized. A generated flex item with `width: calc(50% - 10px)` now contributes its resolved width to the following item's position.
- 218ff3b: Use resolved padding consistently for layout, inline fragments, and resize observations.
  
  For a block with `width:100px;height:80px;padding:10%;border:2px solid` inside
  a 200px-wide parent, percentage padding now contributes 20px on every side.
  Its content-box height remains 80px and its border-box height is 124px, instead
  of losing the vertical padding. ResizeObserver reports the same content box,
  and inline fragments start inside the resolved padding.
  
  Grid items use their grid area's percentage basis. Nested, generated, and
  positioned boxes, plus ordinary content inside table cells, share the corrected
  layout measurements. Backend layout reads are cached until the next computation;
  scroll-only projection reuses them.
- 7fa7bfd: Lay out ordinary descendants inside table cells.
  
  A `width: 100px; height: 40px` div inside a table cell now reports a 100×40px
  rectangle instead of 0×0px and participates in point queries. Cells reuse block,
  flex, grid, and styled inline layout, reflowing text at the allocated column
  width. Top, middle, and bottom alignment place content within taller cells.
  The existing limitations on full intrinsic table sizing remain.
- c75f429: Share styled inline layout across text measurement, fragments, and point queries.
  
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
- 98a8d3b: Unify inline and stylesheet declaration parsing and cascade resolution.
  
  A stylesheet `width: 100px !important` now beats normal inline `width: 200px`,
  instead of producing 200px. Both `width: 2em; font-size: 30px` and the reversed
  order now produce 60px; previously the first order produced 32px.
  
  Quoted semicolons in inline values are parsed as CSS tokens. Generated content
  such as `::before { --label: "Hello"; content: var(--label) }` now resolves the
  pseudo-element's custom properties through the same cascade as its other styles.
  Inline values receive the same parser normalization as stylesheet declarations.
- 8646a92: Resolve nested calculated dimensions against consistent containing blocks.
  
  A child with `width: calc(100% - 20px)` inside a 200px border box with 10px
  padding on each side and 5px borders now resolves to 150px. Nested calculations
  are resolved from outer contexts inward, including auto block widths.
  Absolute descendants use their positioned containing block across static
  ancestors instead of sizing against an intervening static element.
- 228076e: Report stylesheet rules discarded during parser recovery.
  
  For example, stylesheets containing `div: { width: 20px }` now report an unsupported-rule entry for `stylesheet` with the authored CSS when layout is queried. Previously the reporter could remain empty. Strict-policy errors and warning callback errors now propagate unchanged.
- 17f03dc: Apply browser defaults and HTML sizing hints through the shared CSS cascade.
  
  A paragraph with `font-size:2em` inside a 30px parent now uses 60px, rather than
  32px from the portable paragraph default. HTML hints such as `<img width="100">`
  now beat normal user-agent width overrides while remaining overridable by
  normal author CSS. Important user-agent rules retain their higher priority.
  
  Authored `display:inline` on a non-replaced text container now uses the same
  line fragments, dimensions, and hit testing as native phrasing elements. For
  example, `<div style="display:inline">one two three</div>` joins its parent's
  line layout instead of becoming a block. Inline elements and generated boxes
  still become blocks when positioned absolutely/fixed or used as flex/grid items.
  Atomic inline replaced elements and inline-block formatting remain unsupported.
  
  Table properties also use normal inheritance. A caption with `caption-side: top`
  overrides a table's `caption-side: bottom`; `empty-cells` can inherit through
  row groups and rows before a cell's own declaration overrides it.

## 0.9.0

### Minor Changes

- 2df86f3: Support intrinsic grid tracks and box sizes.
  
  For example, `grid-auto-flow: column; grid-auto-columns: max-content` now gives implicit columns their individual content widths instead of falling back to evenly split tracks. Explicit and implicit tracks also accept `auto`, `min-content`, and `fit-content(90px)` (including percentage limits).
  
  `width: max-content` now sizes a box to its unwrapped content; `width: fit-content` clamps its width to the available space between its minimum and maximum content sizes. These keywords also work for height and logical preferred sizes. Intrinsic min/max dimension constraints remain unsupported.
- a04d69d: Support the :root pseudo-class in stylesheets.
  
  Rules targeting :root now match the document element with pseudo-class specificity and supply inherited custom properties. For example, `:root { --panel-width: 80px; } .panel { width: var(--panel-width, 10px); }` now gives `.panel` elements an 80px width instead of the previous 10px fallback.

### Patch Changes

- 2df86f3: Honor important inline declarations.
  
  Inline `style="display: none !important; display: block"` now produces a zero-sized rectangle and removes the element and its descendants from hit testing instead of leaving a visible layout box.
- e45580a: Expose scrollWidth and scrollHeight from cached layout.
  
  A 100×60 container with overflow:auto and a 240×180 child now reports scrollWidth of 240 and scrollHeight of 180, instead of zero. The getters include padding and supported content overflow, exclude borders, respect nested clipping, and remain stable after scrolling. Descendant mutations update both values through the layout cache.
- 52ce15c: Apply native CSS nesting in stylesheets.
  
  Nested declarations now affect layout instead of being discarded. For example, `.card { .item { width: 60px; } }` now gives a matching child a `getBoundingClientRect().width` of 60, where previously the nested width was ignored. Parent selector-list specificity, declarations after nested rules, and nested viewport media queries are preserved.
- 2d734fd: Reuse layout and parsing work across geometry reads, scrolling, and stylesheet edits.
  
  Repeated geometry and point queries now reuse cached validation state and hit-test ordering. For example, reading a row rectangle, setting its container scrollTop to 20, and reading again updates the row position without rebuilding flow layout or measuring its text again. Editing one stylesheet preserves parsed data for other sheets, and viewport changes reuse parsed CSS while selecting the applicable media rules.
  
  Bounded caches reuse inline declaration parsing, selector expansion, and built-in text measurements. Injected textMeasurer implementations remain uncached. Synchronous DOM edits still invalidate geometry on the next read, and hosts whose CSSOM or scroll APIs cannot be intercepted retain conservative validation.
  
  Active layout passes retain expanded selectors even when a stylesheet exceeds the shared cache. For example, opening and closing an Ant Design modal no longer repeatedly expands its scoped selectors for every element; the example interaction tests complete substantially faster without increasing their timeout. These entries are released with the layout session.
  
  Shared parsing and built-in text measurement caches now grow from 512 up to 4,096 entries when recently evicted inputs are reused. For example, repeatedly laying out 600 distinct labels can retain their built-in measurements after the cache grows, instead of continually evicting and recomputing them. Unique inputs alone do not grow the cache; oversized inputs remain uncached.
- cae4faa: Avoid serializing unchanged stylesheets on cached geometry reads.
  
  Repeated calls such as `element.getBoundingClientRect()` now reuse per-sheet CSSOM revisions instead of serializing all document CSS on every read. For example, 200 reads after mounting a 300 KB stylesheet no longer repeat stylesheet serialization 200 times. Declaration edits such as `rule.style.width = "120px"`, rule insertion and replacement, and adopted-sheet reordering still invalidate cached geometry. Hosts with non-patchable CSSOM retain content fingerprinting.

## 0.8.0

### Minor Changes

- 256f122: Add a deterministic, layout-backed IntersectionObserver
  
  Attached windows now report viewport and element-root intersections using the
  shim's geometry, including root margins and threshold crossings. It shares the
  automatic or manual delivery mode used by other layout observers:
  
  ```ts
  const layout = await attachLayoutEngine({
    window,
    observers: { delivery: 'manual' },
  })
  const observer = new window.IntersectionObserver(entries => {
    console.log(entries[0].intersectionRatio)
  }, { threshold: [0, 0.5, 1] })
  observer.observe(element)
  
  layout.flushLayout()
  ```
- b6e836e: Add a deterministic, layout-backed ResizeObserver
  
  Attached windows now report element size changes through the standard
  `ResizeObserver` API. Delivery is automatic by default and remains lazy when
  there are no active observations. Tests can opt into explicit delivery:
  
  ```ts
  const layout = await attachLayoutEngine({
    window,
    observers: { delivery: 'manual' },
  })
  const observer = new window.ResizeObserver(entries => {
    console.log(entries[0].contentRect.width)
  })
  observer.observe(element)
  
  element.style.width = '320px'
  layout.flushLayout() // callback reports 320
  ```
- 1adf41e: Size images, SVG, and canvas using intrinsic aspect ratios
  
  Images now use natural dimensions supplied by the DOM host, SVG can derive its
  ratio from a valid `viewBox`, and canvas uses its bitmap dimensions. A single CSS
  width or height resolves the automatic axis from that ratio, including supported
  min/max constraints and flex/grid placement. Image `load` and `error` events
  invalidate cached geometry when resource dimensions change.
  
  For example, a viewBox-only SVG with a CSS width previously retained the generic
  150-pixel fallback height. It now has the expected 2:1 layout box:
  
  ```html
  <svg id="icon" viewBox="0 0 200 100" style="width:100px;height:auto"></svg>
  ```
  
  ```ts
  await attachLayoutEngine({ window })
  const rect = window.document.querySelector('#icon').getBoundingClientRect()
  console.log(rect.width, rect.height) // 100, 50 (previously 100, 150)
  ```
  
  Image loading and decoding remain the DOM host's responsibility. SVG child
  shapes and canvas pixels do not receive separate rendering or hit-test geometry.
- ec49f81: Measure inherited CSS word spacing
  
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

## 0.7.0

### Minor Changes

- 6ea1902: Lay out non-inline `::before` and `::after` generated content as independent anonymous boxes
  
  Generated boxes now contribute their own dimensions and spacing in normal flow
  and participate as flex or grid items instead of being flattened into the
  originating element's text measurement.
  
  ```css
  /* Before: these box dimensions and spacing were ignored. */
  .card::before {
    content: '';
    display: block;
    height: 12px;
    margin-bottom: 3px;
  }
  
  /* After: ordinary .card content begins 15px after the box starts. */
  ```

### Patch Changes

- 939d08f: Replace the third-party Taffy 0.9.2 WebAssembly package with a repository-owned binding to Taffy 0.14.0
  
  The upgrade removes obsolete compatibility handling:
  
  - Percentage-track pre-scaling for the old JavaScript wrapper.
  - Rewriting named grid areas to numeric line bounds.
  - Blockifying `display: flow-root`.
  - Excluding explicit and empty implicit `minmax()` row cases from verified
    Chromium parity.
  
  For example, `display: flow-root` now establishes its independent formatting
  context through Taffy, and `grid-area: header` reaches Taffy's named-area model
  directly.

## 0.6.0

### Minor Changes

- b3b7b77: Automatically discover initial `@font-face` rules and measure matching text from static TTF, OTF, or WOFF font data.

  For example, a data-URL font with custom glyph advances now determines an auto-sized button's width identically across happy-dom and Chromium, while unavailable families continue through deterministic fallback measurement. The obsolete `createPretextTextMeasurer()` export and Canvas-only Pretext dependency are removed.

- 90ceb56: Include inline phrasing runs in containers that also have block children.

  For example, `<div><h2>Title</h2><span>Details</span></div>` now includes the `Details` line in the container's intrinsic height and exposes the span's client geometry instead of dropping that inline run from layout.

- c340b87: Apply inherited `text-transform` values during intrinsic text measurement.

  For example, a button styled with `text-transform: uppercase` now sizes from `ADD TASK` while its authored `textContent` remains `Add task`; custom text measurers receive the transformed string too.

## 0.5.0

### Minor Changes

- 04f23ec: Apply `rotate()`, `skew()`, and `matrix()` transforms to client geometry and precise polygonal hit testing.

  For example, `elementFromPoint()` no longer selects a rotated element through an empty corner of its bounding rectangle.

- 3b40fe5: Expand `createUnsupportedCssReporter()` summaries with occurrence counts, selectors, affected elements, and observed computed values.

  Consumers can now tell whether an unsupported declaration is repeatedly affecting a tracked element or is likely a superseded fallback:

  ```ts
  const declaration = reporter.getSummary().declarations[0];
  console.log(
    declaration.occurrences,
    declaration.elements,
    declaration.computedValues
  );
  ```

- 830552c: Match structural and state pseudo-class styles and expose wrapped inline fragments through `getClientRects()`.

  After upgrading, `span.getClientRects()` returns one rectangle per wrapped line instead of an empty list, and rules such as `li:nth-child(2) { width: 40px }` affect deterministic layout.

- eae94fb: Add configurable user-agent presentation styles below author CSS.

  Tests can now keep the deterministic portable baseline, disable it, or override selected defaults without duplicating reset CSS in every document.

  ```ts
  // Before: the portable presentation defaults were always active.
  await attachLayoutEngine({ window });

  // After: disable them and define only the baseline this suite needs.
  await attachLayoutEngine({
    window,
    userAgentStyles: {
      profile: "none",
      overrides: "p { margin: 0 }",
    },
  });
  ```

  User-agent overrides remain lower priority than document and inline styles. Structural HTML behavior and native-control intrinsic metrics remain independent.

- c64ab06: Expand selector matching and include `::before`/`::after` string and `attr()` content in intrinsic text layout.

  Generated labels now change their originating element's measured size and following block placement instead of being ignored.

- a87bab3: Improve component-library geometry and hit testing by measuring flex-styled button icons and gaps, resolving percentage insets, and containing descendant `z-index` values within nested positioned stacking contexts.

  For example, an icon button now includes the icon and `gap` in its intrinsic width, while a `z-index: 999` child no longer escapes a parent below a `z-index: 2` sibling.

- a5c7885: Resolve `em`, `rem`, viewport units, custom properties, reducible `calc()` expressions, and mixed percentage-and-pixel dimensions with a definite containing block across supported layout declarations.

  For example, `width: calc(100% - 32px)` now contributes its computed pixel width instead of being ignored as unsupported CSS.

- 5444417: Include inherited `font-weight` and `letter-spacing` in intrinsic and custom text measurement.

  A custom `textMeasurer` can now read `input.fontWeight` and `input.letterSpacing`, while the default measurer includes letter spacing in rendered widths.

- e7d74ff: Return a layout attachment from `attachLayoutEngine()` with runtime viewport control.

  Tests can now attach once in shared setup and resize deterministic layout without rebuilding the DOM:

  ```ts
  const layout = await attachLayoutEngine({ window });
  layout.setViewport({ width: 390, height: 844 });
  ```

  The new viewport updates layout, `innerWidth`, `innerHeight`, and subsequent `matchMedia()` results, and dispatches a window `resize` event.

### Patch Changes

- 501d313: Prevent scoped compound `:where()` and `:is()` selectors from matching unrelated elements when the host DOM implements functional selector matching incorrectly.

  CSS-in-JS rules now remain scoped to their intended components instead of corrupting surrounding layout.

  ```css
  /* Before: some DOM harnesses incorrectly applied this rule to unrelated elements. */
  :where(.library-scope).input:not(.success) {
    border-width: 1px;
  }

  /* After: only elements matching both .library-scope and .input receive it. */
  ```

## 0.4.0

### Minor Changes

- 1a58c8d: Include accessible linked stylesheets and constructable stylesheets in layout.

  The engine now follows document and adoption order and automatically recomputes geometry after CSSOM edits or changes to `document.adoptedStyleSheets`.

  ```ts
  const sheet = new window.CSSStyleSheet();
  sheet.replaceSync(".dialog { position: fixed; inset: 0 }");
  window.document.adoptedStyleSheets = [sheet];

  await attachLayoutEngine({ window });

  // Now covers the configured viewport; previously this sheet was ignored.
  dialog.getBoundingClientRect();
  ```

- 5189aa2: Apply responsive stylesheet `@media` rules against the viewport configured for the layout engine.

  Media types, dimensions, orientation, aspect ratio, query lists, conjunctions, and nested rules now select the same branches as Chromium.

  Previously, media rules were rejected by the unsupported CSS policy. After
  upgrading, matching rules contribute layout:

  ```ts
  document.head.innerHTML = `
    <style>@media (max-width: 600px) { #panel { width: 100px } }</style>
  `;
  document.body.innerHTML = '<div id="panel"></div>';

  await attachLayoutEngine({ window, viewport: { width: 480, height: 800 } });
  document.querySelector("#panel").offsetWidth; // 100
  ```

- 2b49074: Support rectangular named grid templates through `grid-template-areas` and single-name `grid-area` placement.

  Named areas can span rows and columns and may be arranged around unnamed `.` cells.

  Previously, named templates were rejected as unsupported CSS. After upgrading,
  items use the declared area bounds:

  ```ts
  document.body.innerHTML = `
    <main style='display:grid; grid-template-columns:80px 120px;
      grid-template-areas:"nav content"'>
      <article id="content" style="grid-area:content"></article>
    </main>
  `;

  await attachLayoutEngine({ window });
  document.querySelector("#content").offsetLeft; // 80
  ```

- c86fc03: Resolve CSS custom properties before parsing supported layout declarations.

  Inherited values, local overrides, forward references, nested fallbacks, and cyclic references now follow their CSS variable semantics, while values that remain unresolved route through `unsupportedCss`.

  Previously, a supported declaration such as `width: var(--card-width)` was
  ignored as an unsupported value. After upgrading, it contributes layout:

  ```ts
  document.body.innerHTML = `
    <main style="--card-width: 240px">
      <article id="card" style="width:var(--card-width)"></article>
    </main>
  `;

  await attachLayoutEngine({ window });
  document.querySelector("#card").offsetWidth; // 240
  ```

- 97a9a85: Support `position: sticky` for physical insets, scrolling ancestors, viewport scrolling, containing-block limits, hit testing, and simple table headers.

  ```ts
  scroller.scrollTop = 50;

  // Now remains at the scroller's top inset; previously `sticky` was rejected.
  toolbar.getBoundingClientRect().top;
  ```

### Patch Changes

- fa4068f: Make CSS support evidence explain the independently supported behaviors within each topic.

  The exported inventory now provides descriptive, behavior-specific claims instead of broad `current-supported-scope` entries, and its prose marks CSS syntax and API names as inline code for documentation renderers.

  ```ts
  const grid = cssSupportInventory.find((topic) => topic.id === "grid-layout");

  // Now identifies explicit tracks, auto flow, line placement, area placement,
  // and shared placement behavior as separate claims with their own evidence.
  grid?.claims.map((claim) => claim.id);
  ```

  The CSS support explorer also separates implementation support from Chromium
  verification, explains metadata with tooltips, groups dense claim sections,
  and previews parity test sources without leaving the page.

- a8f464c: Make documentation navigation respond immediately after the initial page load.

  The shared shell now swaps internal page content and styles without reloading the document, while direct URLs, refreshes, Back and Forward navigation, scroll restoration, page-specific behavior, and no-JavaScript fallback navigation continue to work normally.

  For example, following the `CSS support` navigation link updates the URL and
  support explorer in place instead of triggering another document load.

## 0.3.0

### Minor Changes

- a2963e2: Add explicit deterministic native-control profile selection and per-control metric overrides.

  The initial `portable` profile names and preserves the package's existing intrinsic control geometry instead of deriving it from the runtime host. Overrides can specialize one metric or replace the complete profile.

  ```ts
  await attachLayoutEngine({
    window,
    nativeControls: {
      profile: "portable",
      overrides: { textInput: { width: 220 } },
    },
  });

  // An unstyled text input is 220×23 on Linux, macOS, and Windows:
  // the width is overridden while the portable height remains in effect.
  document.querySelector("input")?.getBoundingClientRect();
  ```

- d61c212: Support two-dimensional translation and scaling through both `transform` functions and the individual `translate` and `scale` properties.

  Percentage values, transform origins, ordered function lists, transformed descendants, client rectangles, and point queries are included.

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

### Patch Changes

- ee791b0: Update the documentation site with a complete usage guide, syntax-highlighted code examples, highlighted CSS support search matches, automatic light and dark themes, and a package changelog that separates pending Changesets under `Upcoming` from versions confirmed by release tags.

  Navigation is consistent and marks the current page, bracket pairs are depth-colored, CSS support results are relevance-ranked in a denser layout, and changelog commit references link to their source. Shared styles, flash-free generated navigation, responsive menus, visible release context, keyboard focus treatment, and reduced-motion support keep the experience consistent across pages and devices.

  For example, after a feature merges but before its package release, its entry is
  shown as:

  ```text
  Upcoming
    Add the newly merged feature.
  ```

  After the release tag is created, the same changelog section is shown under its
  published version instead.

  For example, searching the CSS support explorer for `flex` now places an exact
  property match before records that only mention flex in supporting notes:

  ```text
  Flex layout — exact property match
  Display model — supporting evidence match
  Grid layout — supporting evidence match
  ```

  Support searches now report the filtered result count, expose labeled and
  resettable controls, and give every support area a stable link such as
  `css-support-status.html#flex-layout`. Guide navigation follows the currently
  visible section and accounts for the sticky header when following a section
  link. The changelog likewise keeps the current version visible while scrolling,
  also identifies the current major, minor, or patch section, links directly to
  release headings, and can filter entries by release type. External references
  open in a separate tab, and Chromium parity fixtures are styled as source links
  rather than inert metadata chips.

  The generated website is deployed from an ignored build directory rather than
  being bundled into the npm package. Authored Markdown and machine-readable
  documentation remain included in the package.

  Internal pages are prefetched and prerendered where the browser supports it, so
  documentation navigation responds immediately without an artificial transition
  delay.

- 4d6d9f3: Improve browser-compatible wrapping in canvas-capable runtimes by updating Pretext to 0.0.8.

  Text such as `foo!bar`, `foo/bar`, and `foo♂bar` now keeps symbols that browsers treat as part of the word within the same breakable run. When wrapping at a soft hyphen, the line now ends at the rendered hyphen instead of incorrectly pulling letters from after the break onto the preceding line.

  For example, at a constrained width, a soft-hyphen break changes from:

  ```text
  trans-a | tlantic
  ```

  to the browser-compatible break:

  ```text
  trans- | atlantic
  ```

  Runtimes without Canvas 2D text measurement continue to use the deterministic
  fallback measurer and are unaffected by these Pretext-specific corrections.

## 0.2.0

### Minor Changes

- ff1ef3b: Patch `offsetTop`, `offsetLeft`, and `offsetParent` from the layout snapshot.

  Previously, these properties came from the host DOM implementation and could
  disagree with the engine's geometry:

  ```ts
  element.offsetTop;
  element.offsetLeft;
  element.offsetParent;
  ```

  They now describe the element relative to its layout-backed CSS offset parent,
  including positioned ancestors, borders, margins, and scrolling.

- a6bdc8b: Implement `Element.scrollIntoView()` against the layout snapshot so calls consistently affect layout-backed geometry instead of relying on the host DOM implementation.

  The method scrolls nested containers and the configured viewport using boolean
  or `block`/`inline` alignment options. Smooth behavior is applied immediately
  to keep test layout deterministic.

- 8be6e4f: Support adjacent (`+`) and general (`~`) sibling combinators in stylesheet selectors.

- 68fc5d9: Answer `window.matchMedia()` queries from the configured layout viewport.

  Previously, `matchMedia()` used the DOM environment's viewport, which could
  disagree with the dimensions used by the layout engine:

  ```ts
  await attachLayoutEngine({
    window,
    viewport: { width: 320, height: 640 },
  });

  // Previously: false when the DOM environment was wider than 500px
  window.matchMedia("(max-width: 500px)").matches;
  ```

  It now evaluates the query against the configured 320px-wide layout viewport:

  ```ts
  // Now: true
  window.matchMedia("(max-width: 500px)").matches;
  ```

- 3724069: Recompute layout after style elements are added or changed and after existing CSSOM rules are edited or deleted.

- b26f8ce: Add an unsupported CSS reporter that reduces warning streams to a stable adoption-cost summary across a test suite.

  Previously, consumers had to build their own aggregation around `onWarning`:

  ```ts
  const warnings = [];

  await attachLayoutEngine({
    window,
    unsupportedCss: {
      onWarning: (warning) => warnings.push(warning),
    },
  });
  ```

  The reporter now deduplicates declarations and exposes one headline count with
  sorted diagnostic details:

  ```ts
  const reporter = createUnsupportedCssReporter();

  await attachLayoutEngine({
    window,
    unsupportedCss: { onWarning: reporter.onWarning },
  });

  const { unsupportedDeclarationCount, declarations } = reporter.getSummary();
  ```

## 0.1.0

### Minor Changes

- 9d8958b: Release the package into the public domain under the Unlicense, permitting use, copying, modification, publishing, compilation, sale, and distribution for any commercial or non-commercial purpose.

- 0bb1dbe: Establish the package as DOM Layout Shim, published as `dom-layout-shim`, with repository, issue tracker, and documentation metadata for the renamed project.

- 7334dfa: Continue layout with deduplicated, actionable warnings when CSS is unsupported.

  Strict failures and deliberate suppression remain available through `unsupportedCss: { default: 'throw' }` and `{ default: 'ignore' }`.

### Patch Changes

- 100c77b: Clarify Chromium parity evidence for native text and form-control metrics that vary across host platforms while retaining exact checks for stable dimensions and author-sized time inputs and textareas.
