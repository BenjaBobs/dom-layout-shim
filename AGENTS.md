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

Add unit tests in `test/unit/**/*.test.ts` for engine behavior and DOM API patching. Add browser parity cases in `test/browser-parity/` when behavior depends on real Chromium layout, hit-testing, or CSS semantics. Name cases by behavior, for example `absolute-overlap` or `pointer-events-none`.

Run `pnpm test` for normal changes. Run `pnpm run test:browser-parity` for CSS, layout, geometry, or hit-testing changes. Run `pnpm run build` before publishing-facing changes.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `remove tsx + allow playwright`. Keep commits focused and mention the changed behavior, not just files.

Pull requests should include a brief description, commands run, and notes about parity or benchmark impact. Link related issues when available. Screenshots are only useful for documentation or browser-observed behavior changes.

## Agent-Specific Notes

Do not commit generated directories such as `.cache`, `.tmp`, `.pnpm-store`, `.playwright-browsers`, or `dist/`. Use `GIT_CONFIG_GLOBAL=/dev/null` if the sandbox cannot read the user-level git config.
