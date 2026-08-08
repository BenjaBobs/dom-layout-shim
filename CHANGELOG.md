# dom-layout-shim

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
