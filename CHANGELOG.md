# dom-layout-shim

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
