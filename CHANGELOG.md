# dom-layout-shim

## 0.6.0

### Minor Changes

- b3b7b77: Automatically discover initial `@font-face` rules and measure matching text from static TTF, OTF, or WOFF font data. For example, a data-URL font with custom glyph advances now determines an auto-sized button's width identically across happy-dom and Chromium, while unavailable families continue through deterministic fallback measurement. The obsolete `createPretextTextMeasurer()` export and Canvas-only Pretext dependency are removed.
- 90ceb56: Include inline phrasing runs in containers that also have block children. For example, `<div><h2>Title</h2><span>Details</span></div>` now includes the `Details` line in the container's intrinsic height and exposes the span's client geometry instead of dropping that inline run from layout.
- c340b87: Apply inherited `text-transform` values during intrinsic text measurement. For example, a button styled with `text-transform: uppercase` now sizes from `ADD TASK` while its authored `textContent` remains `Add task`; custom text measurers receive the transformed string too.

## 0.5.0

### Minor Changes

- 04f23ec: Apply `rotate()`, `skew()`, and `matrix()` transforms to client geometry and precise polygonal hit testing. For example, `elementFromPoint()` no longer selects a rotated element through an empty corner of its bounding rectangle.
- 3b40fe5: Expand `createUnsupportedCssReporter()` summaries with occurrence counts, selectors, affected elements, and observed computed values. Consumers can now tell whether an unsupported declaration is repeatedly affecting a tracked element or is likely a superseded fallback:

  ```ts
  const declaration = reporter.getSummary().declarations[0];
  console.log(
    declaration.occurrences,
    declaration.elements,
    declaration.computedValues
  );
  ```

- 830552c: Match structural and state pseudo-class styles and expose wrapped inline fragments through `getClientRects()`. After upgrading, `span.getClientRects()` returns one rectangle per wrapped line instead of an empty list, and rules such as `li:nth-child(2) { width: 40px }` affect deterministic layout.
- eae94fb: Add configurable user-agent presentation styles below author CSS. Tests can now keep the deterministic portable baseline, disable it, or override selected defaults without duplicating reset CSS in every document.

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

- c64ab06: Expand selector matching and include `::before`/`::after` string and `attr()` content in intrinsic text layout. Generated labels now change their originating element's measured size and following block placement instead of being ignored.
- a87bab3: Improve component-library geometry and hit testing by measuring flex-styled button icons and gaps, resolving percentage insets, and containing descendant `z-index` values within nested positioned stacking contexts. For example, an icon button now includes the icon and `gap` in its intrinsic width, while a `z-index: 999` child no longer escapes a parent below a `z-index: 2` sibling.
- a5c7885: Resolve `em`, `rem`, viewport units, custom properties, reducible `calc()` expressions, and mixed percentage-and-pixel dimensions with a definite containing block across supported layout declarations. For example, `width: calc(100% - 32px)` now contributes its computed pixel width instead of being ignored as unsupported CSS.
- 5444417: Include inherited `font-weight` and `letter-spacing` in intrinsic and custom text measurement. A custom `textMeasurer` can now read `input.fontWeight` and `input.letterSpacing`, while the default measurer includes letter spacing in rendered widths.
- e7d74ff: Return a layout attachment from `attachLayoutEngine()` with runtime viewport control. Tests can now attach once in shared setup and resize deterministic layout without rebuilding the DOM:

  ```ts
  const layout = await attachLayoutEngine({ window });
  layout.setViewport({ width: 390, height: 844 });
  ```

  The new viewport updates layout, `innerWidth`, `innerHeight`, and subsequent `matchMedia()` results, and dispatches a window `resize` event.

### Patch Changes

- 501d313: Prevent scoped compound `:where()` and `:is()` selectors from matching unrelated elements when the host DOM implements functional selector matching incorrectly. CSS-in-JS rules now remain scoped to their intended components instead of corrupting surrounding layout.

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
  The engine now follows document and adoption order and automatically recomputes
  geometry after CSSOM edits or changes to `document.adoptedStyleSheets`.

  ```ts
  const sheet = new window.CSSStyleSheet();
  sheet.replaceSync(".dialog { position: fixed; inset: 0 }");
  window.document.adoptedStyleSheets = [sheet];

  await attachLayoutEngine({ window });

  // Now covers the configured viewport; previously this sheet was ignored.
  dialog.getBoundingClientRect();
  ```

- 5189aa2: Apply responsive stylesheet `@media` rules against the viewport configured for
  the layout engine. Media types, dimensions, orientation, aspect ratio, query
  lists, conjunctions, and nested rules now select the same branches as Chromium.

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

- 2b49074: Support rectangular named grid templates through `grid-template-areas` and
  single-name `grid-area` placement. Named areas can span rows and columns and may
  be arranged around unnamed `.` cells.

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
  Inherited values, local overrides, forward references, nested fallbacks, and
  cyclic references now follow their CSS variable semantics, while values that
  remain unresolved route through `unsupportedCss`.

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

- 97a9a85: Support `position: sticky` for physical insets, scrolling ancestors, viewport
  scrolling, containing-block limits, hit testing, and simple table headers.

  ```ts
  scroller.scrollTop = 50;

  // Now remains at the scroller's top inset; previously `sticky` was rejected.
  toolbar.getBoundingClientRect().top;
  ```

### Patch Changes

- fa4068f: Make CSS support evidence explain the independently supported behaviors within
  each topic. The exported inventory now provides descriptive, behavior-specific
  claims instead of broad `current-supported-scope` entries, and its prose marks
  CSS syntax and API names as inline code for documentation renderers.

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
  The shared shell now swaps internal page content and styles without reloading
  the document, while direct URLs, refreshes, Back and Forward navigation, scroll
  restoration, page-specific behavior, and no-JavaScript fallback navigation
  continue to work normally.

  For example, following the `CSS support` navigation link updates the URL and
  support explorer in place instead of triggering another document load.

## 0.3.0

### Minor Changes

- a2963e2: Add explicit deterministic native-control profile selection and per-control
  metric overrides. The initial `portable` profile names and preserves the
  package's existing intrinsic control geometry instead of deriving it from the
  runtime host. Overrides can specialize one metric or replace the complete
  profile.

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

- d61c212: Support two-dimensional translation and scaling through both `transform`
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

### Patch Changes

- ee791b0: Update the documentation site with a complete usage guide, syntax-highlighted
  code examples, highlighted CSS support search matches, automatic light and dark
  themes, and a package changelog that separates pending Changesets under
  `Upcoming` from versions confirmed by release tags. Navigation is consistent
  and marks the current page, bracket pairs are depth-colored, CSS support results
  are relevance-ranked in a denser layout, and changelog commit references link
  to their source. Shared styles, flash-free generated navigation, responsive
  menus, visible release context, keyboard focus treatment, and reduced-motion
  support keep the experience consistent across pages and devices.

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

- 4d6d9f3: Improve browser-compatible wrapping in canvas-capable runtimes by updating
  Pretext to 0.0.8. Text such as `foo!bar`, `foo/bar`, and `foo♂bar` now keeps
  symbols that browsers treat as part of the word within the same breakable run.
  When wrapping at a soft hyphen, the line now ends at the rendered hyphen instead
  of incorrectly pulling letters from after the break onto the preceding line.

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

- a6bdc8b: Implement `Element.scrollIntoView()` against the layout snapshot so calls
  consistently affect layout-backed geometry instead of relying on the host DOM
  implementation.

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
- b26f8ce: Add an unsupported CSS reporter that reduces warning streams to a stable
  adoption-cost summary across a test suite.

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

- 9d8958b: Release the package into the public domain under the Unlicense, permitting use,
  copying, modification, publishing, compilation, sale, and distribution for any
  commercial or non-commercial purpose.
- 0bb1dbe: Establish the package as DOM Layout Shim, published as `dom-layout-shim`, with
  repository, issue tracker, and documentation metadata for the renamed project.
- 7334dfa: Continue layout with deduplicated, actionable warnings when CSS is unsupported.
  Strict failures and deliberate suppression remain available through
  `unsupportedCss: { default: 'throw' }` and `{ default: 'ignore' }`.

### Patch Changes

- 100c77b: Clarify Chromium parity evidence for native text and form-control metrics that
  vary across host platforms while retaining exact checks for stable dimensions
  and author-sized time inputs and textareas.
