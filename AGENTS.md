# Repository Guidelines

## Project Structure & Module Organization

This package provides deterministic layout and hit testing for DOM-like test
harnesses. Source is split into `src/api/` for public contracts, DOM attachment,
DOM-like interfaces, and integration glue, and `src/css-parity-implementation/`
for CSS parsing, layout, geometry, and hit-testing algorithms. Public exports
are centralized in `src/index.ts`; CSS parity implementation modules must not
be exported directly from it.

Tests live under `test/`: unit coverage is in `test/unit/`, Chromium parity cases are in `test/browser-parity/`, shared parity fixtures are in `test/browser-parity/fixtures/`, and performance checks are in `test/bench/`. Authored documentation lives in `docs/`, the site implementation lives in `docs-engine/`, and ignored site output is generated in `.site/`. Package build output is `dist/`.

## Build, Test, and Development Commands

Use `pnpm` for all package commands.

- `pnpm run typecheck`: runs TypeScript with `noEmit`.
- `pnpm run build`: emits `dist/` using `tsconfig.build.json`.
- `pnpm test`: runs Vitest unit tests in `happy-dom`.
- `pnpm run test:browser-parity`: runs Chromium parity tests via Playwright using `.playwright-browsers`.
- `pnpm run bench`: runs `test/bench/hit-testing.bench.ts` with native Node TypeScript support.

The test scripts create repo-local `.tmp` and `.cache` directories to avoid sandbox `/tmp` issues.

## Coding Style & Naming Conventions

Write TypeScript as ES modules. Use explicit `.ts` extensions for local relative imports so Node can execute TypeScript files directly; build output rewrites them to `.js`. Prefer named exports and wire public API additions through `src/index.ts`.

Follow the existing style: two-space indentation, no semicolons, single quotes, concise type names, and kebab-case file names such as `create-layout-engine.ts`. There is no separate formatter or linter configured; rely on `pnpm run typecheck` and local consistency.

## Documentation Guidelines

Treat documentation as part of every public API change. When adding, changing,
or removing a public export, option, contract, or consumer-visible behavior,
review and update the README, the public guide source in `docs/guide.md`, and the
machine-readable guide in `docs/llms.txt` in the same change. Examples should
use the public API and show the resulting consumer-visible behavior. Also keep
the Changeset and any affected `support/css/` records consistent with those
docs. Do not consider a public API change complete while its documented usage
or outcome is stale. The documentation changelog derives its `Upcoming` section
from pending Changesets; do not manually copy pending entries into
`CHANGELOG.md`.

`docs/` contains authored documentation content, including the Markdown guide
in `docs/guide.md`, while `docs-engine/` contains the renderers, templates, and
assets used to present it. The CSS support explorer remains a purpose-built HTML
template because its controls and generated inventory are application-like. The
ignored `.site/` directory is generated deployment output and must not be
committed. Edit shared shell behavior in `scripts/docs-page-shell.mjs`, guide
rendering in `docs-engine/render-guide.mjs`, shared styles and browser behavior
in `docs-engine/assets/`, and changelog rendering in
`scripts/generate-changelog-page.mjs`. Run `pnpm run docs:generate` after edits
and `pnpm run docs:check` before committing.

## Testing Guidelines

Use both unit tests and Chromium parity tests, but keep their responsibilities
separate. Browser parity tests should own browser-observable layout, CSS, and
hit-testing behavior that this package claims to support, such as block flow,
flex placement, positioning, box sizing, text line height, dimensions, and point
queries. Unit tests should own engine mechanics and package-specific contracts,
such as attachment lifecycle, DOM API patching, mutation invalidation, custom
`textMeasurer` behavior, unsupported CSS policy, `data-layout-*` metadata,
multi-window isolation, and debug output.

Avoid duplicating the same layout assertion in both suites. If a parity test
already proves that a CSS/layout behavior matches Chromium, keep unit coverage
only when it exercises a distinct non-parity concern, for example an injected
measurer or an inline-parser edge.

Do not add unit tests for browser-observable layout behavior just because the
implementation changed. Native element dimensions, CSS layout semantics,
geometry, and hit-testing order belong in Chromium parity tests. Unit tests
should stay focused on engine and package-specific behavior that Chromium cannot
serve as the oracle for, such as lifecycle, invalidation, policy routing,
metadata hooks, injected measurement, and debug/assertion contracts.

Add unit tests in `test/unit/**/*.test.ts` for engine behavior and DOM API
patching. Add browser parity cases in `test/browser-parity/` when behavior
depends on real Chromium layout, hit-testing, or CSS semantics. Name cases by
behavior, for example `absolute-overlap` or `pointer-events-none`.

Run `pnpm test` for normal changes. Run `pnpm run test:browser-parity` for CSS, layout, geometry, or hit-testing changes. Run `pnpm run build` before publishing-facing changes.

Browser parity assertions are exact. Do not add numeric tolerances to make an
implementation or host mismatch pass. When Chromium itself varies across
supported hosts, select an explicit platform expectation or use committed,
runner-specific snapshots with recorded provenance.

Native-control intrinsic sizes are an exception to direct cross-host parity:
keep the complete observable suite in
`test/browser-parity/snapshots/native-control-sizes.json`. Compare the selected
engine profile exactly on every host, and compare Chromium exactly against the
recorded GitHub runner snapshot in CI. Refresh all platform records from one
matrix run so Chromium, runner, and profile changes produce a reviewable
per-control diff; do not replace snapshot mismatches with broader tolerances.

Keep the records in `support/css/` up to date whenever CSS parsing, layout
behavior, hit-testing behavior, visual/inert CSS handling, parity coverage,
implementation quirks, or tracked CSS TODOs change. Update claim support,
parity status, owner, fixture references, conditions, and notes in the same
change that modifies the behavior. Run `pnpm run css:check` to validate and
generate the inventory. The overview can be viewed with `pnpm run css:status`.

## Commit & Pull Request Guidelines

Follow the commit convention documented in `README.md`.

When a commit specifically targets and fully resolves an issue, include a
closing keyword on its own line in the commit body, for example
`Closes #23`. Use a plain issue reference without a closing keyword when the
commit contributes to an issue but does not complete it.

Dependency update issues are discovery tasks, not merge-ready version bumps.
Before resolving one, read the upstream release notes between the installed and
target versions, identify and apply required migrations, run the relevant full
validation, and add a descriptive Changeset when the update has user-facing
package impact.

Every pull request with user-facing release impact must add or update a
descriptive Changeset file. Pull requests without user-facing release impact
must not add an empty Changeset. The generated `Version Packages` pull request
is exempt because it consumes pending Changesets. Run `pnpm run changeset` for
a user-facing change.

A follow-up pull request may update an existing pending Changeset only when it
refines the same unreleased consumer-facing change. Prefer a new Changeset for
an independent change so pull requests remain easy to review and revert. Follow
the version and summary guidance in `CONTRIBUTING.md` and
`docs/releasing.md`. Every Changeset for a consumer-facing change must state
the observable effect of upgrading and include a concise example that
demonstrates that effect. Prefer a before-and-after comparison when behavior
changes. Keep examples focused on public usage or output, make the changed
outcome explicit, and omit test setup and internal implementation details.

Pull requests should include a brief description, commands run, and notes about
parity or benchmark impact. Link related issues when available. Screenshots are
only useful for documentation or browser-observed behavior changes.

## Agent-Specific Notes

Do not commit generated directories such as `.cache`, `.tmp`, `.pnpm-store`, `.playwright-browsers`, or `dist/`. Use `GIT_CONFIG_GLOBAL=/dev/null` if the sandbox cannot read the user-level git config.

## Notes on implementing the layout engine

Any quirks or mismatches between how the engine works, and how the browser renders should be documented in code, so we know WHY we do the work arounds.
This will also be handy for when Taffy version is updated, we can compare patch notes with our quirk documentation in the code to see whether quirks are fixed.
