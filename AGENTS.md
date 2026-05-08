# Repository Guidelines

## Project Structure & Module Organization

This package provides deterministic layout and hit testing for DOM-like test harnesses. Source lives in `src/`, organized by responsibility: `engine/` configures the layout engine, `attachment/` patches DOM APIs, `layout/` computes boxes, `hit-testing/` resolves pointer targets, `css/` parses supported CSS, and `geometry/` contains primitives. Public exports are centralized in `src/index.ts`.

Tests live under `test/`: unit coverage is in `test/unit/`, Chromium parity cases are in `test/browser-parity/`, shared parity fixtures are in `test/browser-parity/fixtures/`, and performance checks are in `test/bench/`. Documentation lives in `docs/`; generated output is `dist/`.

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

Add unit tests in `test/unit/**/*.test.ts` for engine behavior and DOM API
patching. Add browser parity cases in `test/browser-parity/` when behavior
depends on real Chromium layout, hit-testing, or CSS semantics. Name cases by
behavior, for example `absolute-overlap` or `pointer-events-none`.

Run `pnpm test` for normal changes. Run `pnpm run test:browser-parity` for CSS, layout, geometry, or hit-testing changes. Run `pnpm run build` before publishing-facing changes.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `remove tsx + allow playwright`. Keep commits focused and mention the changed behavior, not just files.

Pull requests should include a brief description, commands run, and notes about parity or benchmark impact. Link related issues when available. Screenshots are only useful for documentation or browser-observed behavior changes.

## Agent-Specific Notes

Do not commit generated directories such as `.cache`, `.tmp`, `.pnpm-store`, `.playwright-browsers`, or `dist/`. Use `GIT_CONFIG_GLOBAL=/dev/null` if the sandbox cannot read the user-level git config.

## Notes on implementing the layout engine

Any quirks or mismatches between how the engine works, and how the browser renders should be documented in code, so we know WHY we do the work arounds.
This will also be handy for when Taffy version is updated, we can compare patch notes with our quirk documentation in the code to see whether quirks are fixed.
