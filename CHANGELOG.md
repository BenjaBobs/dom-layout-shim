# dom-layout-shim

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
