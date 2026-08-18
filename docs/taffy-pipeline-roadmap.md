# Taffy Pipeline Roadmap

The layout engine should present one browser-facing attachment API while using
Taffy as the primary geometry solver internally. Taffy owns layout geometry
where it can model the browser behavior. This package owns DOM traversal, CSS
normalization, measurement inputs, DOM API semantics, and hit testing.

## Target Pipeline

```text
DOM + CSS
  -> resolved supported style model
  -> layout normalization and classification
  -> Taffy tree plus measure contexts
  -> Taffy layout computation
  -> LayoutSnapshot
  -> patched DOM APIs and hit testing
```

The core rule is:

> Anything that can affect another node's layout must enter before or during the
> Taffy pass. Post-processing may only derive API and hit-test data from final
> geometry.

## Ownership

- Taffy owns block, flex, grid, sizing constraints, margin, padding, border,
  box sizing, and supported positioning geometry.
- Text measurement is supplied to Taffy through measure callbacks. Initial
  supported `@font-face` sources provide parsed glyph metrics; unmatched fonts
  use a deterministic approximation.
- Replaced element intrinsic dimensions are supplied through measure callbacks.
- `display: none`, the `hidden` attribute, ignored DOM tags, CSS parsing,
  cascade, unsupported CSS policy, and layout metadata are handled before tree
  construction.
- `getBoundingClientRect()`, `offset*`, `client*`, `elementFromPoint()`,
  `elementsFromPoint()`, `visibility`, `pointer-events`, `z-index`, and DOM
  order are derived from the final Taffy result.

## Reconciliation Rules

- Translate directly into Taffy when the rule has an equivalent Taffy concept.
- Use measure contexts for intrinsic content sizes that Taffy must account for
  during layout.
- Apply post-layout handling only for behavior that does not affect flow,
  containing blocks, intrinsic sizes, or sibling/parent placement.
- Throw, ignore, or approximate unsupported layout-affecting CSS through the
  unsupported CSS policy. The default should remain conservative.
- Do not merge boxes from an independent non-Taffy layout engine into a Taffy
  result.

## Migration Roadmap

- Keep the Taffy path consuming the same configured text measurement pipeline as
  the rest of the engine.
- Introduce one top-level compute path organized around style resolution,
  layout model normalization, Taffy tree construction, measurement, Taffy
  compute, and snapshot collection.
- Keep Taffy as the default backend while expanding unit and browser-parity
  coverage through that path.
- Continue hardening positioned containing blocks, relative offsets, replaced
  element sizing, text leaf sizing, client rects, and hit-testing metadata in
  the Taffy pipeline.
- Remove the deprecated `layoutBackend: 'taffy'` compatibility no-op from the
  public API once callers have had a migration window.

## High-Risk Boundaries

- Text wrapping and intrinsic size measurement.
- Absolute and fixed containing block resolution.
- Relative positioning that changes visual geometry without changing flow
  placement.
- Margins, box sizing, min/max constraints, padding, and border contributions.
- Any post-layout correction that changes size or position.

Changes at these boundaries need parity-focused tests because mistakes can
invalidate parent size, sibling placement, or hit-testing order.
