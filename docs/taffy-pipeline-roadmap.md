# Taffy Pipeline Roadmap

The layout engine should present one browser-facing layout engine API while using
Taffy as the primary geometry solver internally. Taffy owns layout geometry
where it can model the browser behavior. This package owns DOM traversal, CSS
normalization, measurement inputs, DOM API semantics, and hit testing.

The repository owns a narrow WebAssembly binding pinned to Taffy 0.14.0. Its
Rust source defines only the operations and style values this pipeline uses;
generated JavaScript and WebAssembly are build output rather than source.

## Current entry points

Start with the owner of the behavior being changed; the large adapter is the
orchestrator, not the starting point for every CSS fix. Paths below are relative
to `src/css-parity-implementation/`.

| Responsibility | Entry point | Contract |
| --- | --- | --- |
| Declaration parsing | `css/declaration-list.ts` | Inline attributes and stylesheet AST blocks produce common declarations with priority metadata. |
| Source selection | `css/element-cascade.ts` | Matched rules and inline declarations retain origin and diagnostic context. |
| Style construction | `css/style-resolver.ts` | One session resolves elements, pseudo-elements, and anonymous styles; variables and properties consume one declaration selection. |
| Computed values | `css/cascade.ts`, `css/inherited-style.ts` | Apply origin/importance ordering, custom properties, font dependencies, and shared inheritance. |
| Whitespace and wrapping | `layout/text-lines.ts` | Common line breaking with interchangeable width measurement. |
| Styled inline layout | `layout/inline-formatting.ts` | Measurement and element-owned fragments share a cached formatting result. |
| Percentage dependencies | `layout/containing-block.ts` | Pre-layout and measured phases share containing-block, definiteness, and box-inset rules. |
| Formatting classification | `layout/formatting-tree.ts`, `layout/formatting-plan.ts` | Capture element participation, ordered content, generated styles, and table roles once. All backend nodes register their source identity and children, including anonymous contexts. |
| Tree construction and compute | `layout/taffy-layout-source.ts` | Build backend nodes and formatting contexts, including ordinary descendants inside table cells. |
| Resolved box metrics | `layout/box-metrics.ts`, `layout/taffy/taffy-bindings.ts` | Backend border/padding values feed content/client geometry, scroll sizes, and containing-block calculations; no consumer-specific percentage reconstruction. |
| Phase capabilities | `layout/layout-state.ts`, `layout/collect-layout.ts` | Construction owns the backend and measurer. Completion captures resolved styles, backend results, and inline fragments. Collection has stored values and fresh scratch state only. |
| Canonical geometry | `layout/geometry-record.ts` | Principal boxes, inline fragments, and no-box records derive offset, client, resize, and hit geometry together from numeric inputs. |
| Snapshot output allocation | `layout/layout-geometry.ts` | Require scroll offsets and principal scroll sizes before completion, supply inline/no-box zero metrics, and reject subsequent scratch writes. |
| Visual projection | `layout/project-layout.ts` | Read layout geometry and computed styles; return separate visual output without mutating layout or calling the backend/cascade. |
| Consumer snapshot | `layout/layout-source.ts` | Read-only snapshot maps and arrays feed the layout engine and observers. |

### Phase invariants

- Every formatting kind requires explicit layout and geometry participation.
  Construction dispatch is exhaustive; collectors reject fragments or principal
  boxes for incompatible kinds.
- Every style field requires an explicit inherited/initial classification. Table
  captions and empty cells consume computed inheritance, without layout-time
  guesses based on default values or table ancestors.
- Completed styles are deeply read-only to formatting and projection. Only the
  resolver can initialize styles or call cascade/inheritance machinery; source
  boundary tests parse runtime imports, re-exports, and dynamic imports.
- Complete flow-affecting work before visual projection. Every backend node is registered in the formatting plan. Calculations follow
  its parent/child dependencies, including generated and anonymous contexts.
  Intrinsic and allocated table-cell passes use the same scheduler before row
  constraints are finalized; there is no DOM-only queue or all-cell catch-up pass.
- Backend layout reads are immutable and cached until the next computation. The
  binding owns invalidation; collectors cannot import the raw generated backend.
- Every formatting context supplies principal boxes, inline fragments, or an
  explicit no-box record. Shared constructors derive every geometry output. Anonymous
  formatting boxes cannot overwrite their originating DOM element. Replacing an
  element record also replaces its hit fragments.
- Visual projection returns separate maps and leaves its layout input unchanged.
  Reprojection allocates new geometry. It must not mutate an earlier snapshot
  or invoke backend layout or text measurement when only scroll offsets change.
- Layout client/offset dimensions and projected visual rectangles are distinct
  outputs. Hit regions and intersection rectangles use the same clip chain. Resize
  observation boxes are separate from inline offset unions.
- Preserve DOM ancestry for paint and clipping when absolute backend nodes move
  to their containing block.
- `test/unit/source-boundaries.test.ts` enforces runtime dependency boundaries;
  `test/unit/layout-projection.test.ts` compares reprojection with a full compute
  and checks snapshot retention. `test/unit/geometry-contract.test.ts` owns
  canonical-record replacement and scroll completion checks. Browser-observable interactions belong in
  `test/browser-parity/cases/`.

### Focused validation and reading

Use symbol searches and targeted file sections before reading the full adapter.
Run focused tests while implementing, then the repository's full required checks.
Save full command output under ignored `.tmp/` and inspect summaries or failures
instead of repeatedly loading successful build logs. Do not run package commands
that rebuild WASM concurrently: tests, typechecking, builds, and docs share the
generated binding directory. After a build, focused `pnpm exec vitest run`
commands can reuse it.

### Specialized behavior and completion criteria

`css/html-style-defaults.ts` supplies user-agent declarations and presentational
hints to the common cascade; it cannot mutate a style. Normal hints rank between
normal user-agent and author declarations. Hidden-input and controls-free audio
suppression are explicit HTML box-generation constraints. Computed blockification
is shared by elements and pseudos, including items flattened through contents.

Table track allocation and inline formatting remain specialized algorithms. They
must reuse resolved styles and submit canonical box or fragment records. Their existence
is not evidence that arbitrary CSS properties belong in those algorithms.

A feature is complete only when its shared semantic owner and affected consumers
are covered. Check equivalent declaration sources, ordinary/pseudo inheritance,
relevant formatting contexts, and geometry consumers (fragments, dimensions,
observers, hits, and scroll reprojection). Select the relevant combinations; do
not duplicate every layout assertion in unit and parity suites. Document any
remaining unsupported combinations in the support inventory rather than marking
a broader feature complete.

## Taffy 0.14 Upgrade Audit

The upgrade from the third-party Taffy 0.9.2 package removed compatibility
behavior that the current engine now owns natively:

- Percentage grid tracks are passed as CSS percentages; the Rust boundary
  performs the unit conversion instead of pre-scaling values for the old
  JavaScript wrapper.
- `flow-root` reaches `Display::FlowRoot` instead of being blockified.
- Named grid templates and named item placements reach Taffy's grid-area model
  instead of being rewritten to numeric line bounds in TypeScript.
- Explicit `minmax()` row caps and empty implicit `minmax()` rows in auto-height
  grids now have direct Chromium parity coverage; their 0.9.2 limitation notes
  were removed.

The remaining adapter behavior is not made obsolete by Taffy 0.14:

- Taffy 0.14 block item construction resolves vertical percentage padding against
  parent height. The owned binding normalizes percentages against parent inline
  size in a finite outer-to-inner backend-node traversal, then computes final
  layout. This covers generated/anonymous nodes too; geometry never repairs the
  resulting flow sizes. Revisit when upstream `block::generate_item_list` uses
  `node_inner_size.width` for the padding basis.

- Mixed `calc()` values retain dependency-ordered deferred resolution because
  `TaffyTree`'s high-level implementation does not resolve opaque calc handles;
  native resolution requires a custom low-level tree.
- Flex and grid children remain sorted before tree construction because Taffy
  style has no CSS `order` field.
- Fixed, sticky, transform, inline formatting, table, and DOM measurement logic
  remains in the adapter because those browser and DOM semantics are not Taffy
  layout primitives.
- Fractional tracks remain represented as a zero minimum plus an `fr` maximum,
  which is Taffy's native track-sizing representation rather than a correction.

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
