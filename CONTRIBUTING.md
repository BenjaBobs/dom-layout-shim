# Contributing

Thanks for contributing to DOM Layout Shim.

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Use
[SUPPORT.md](SUPPORT.md) to choose the right issue type and
[SECURITY.md](SECURITY.md) for private vulnerability reports.

## Set up the repository

Use Node.js 22 or newer, `pnpm` 10, Rust 1.98, and `wasm-pack` 0.15. The Rust
toolchain must include the `wasm32-unknown-unknown` target. With mise and rustup:

```sh
mise use node@22
mise use pnpm@10
mise use rust@1.98
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.15.0 --locked
pnpm install
pnpm test
```

The Rust source and lockfile for the repository-owned Taffy 0.14 binding are
committed. Generated JavaScript glue and WebAssembly are ignored in the source
tree and rebuilt automatically by package commands.

The repository is a pnpm workspace. Packages under `examples/` are private
consumers that depend on the root package with the `workspace:*` protocol. Run
all example builds, typechecks, and tests with:

```sh
pnpm run examples:check
```

The package uses TypeScript ES modules. Local relative imports include explicit
`.ts` extensions so Node can execute the source directly.

## Describe the release intent

For a user-facing change, add or update a file in `.changeset/` by running:

```sh
pnpm run changeset
```

Choose the version impact and write a summary for package consumers. Use:

- `patch` for fixes, compatibility corrections, and materially improved
  compatibility evidence.
- `minor` for new capabilities and breaking changes before 1.0.

Every Changeset must state the observable effect for package consumers and
include a concise example that demonstrates it. Prefer a before-and-after
comparison when behavior changes. Keep examples focused on public usage or
output rather than tests or internal implementation details. See
[docs/releasing.md](docs/releasing.md#code-examples) for an example.

Changesets accumulate until the next release. A follow-up pull request may
update an existing pending Changeset when it refines the same unreleased
consumer-facing change. Prefer a new Changeset for an independent change so
that pull requests remain easy to review and revert.

Pull requests with no user-facing release impact do not include a Changeset.
Do not add empty Changesets.

See [docs/releasing.md](docs/releasing.md) for the complete release policy and
automated publication flow.

## Test the change

Use the checks appropriate to the files and behavior changed:

- `pnpm run biome:check`: check formatting, lint rules, and import organization.
- `pnpm run biome:fix`: apply Biome's safe fixes locally.
- `pnpm run typecheck`: validate TypeScript.
- `pnpm test`: run unit tests for engine and package-specific behavior.
- `pnpm run test:browser-parity`: compare browser-observable CSS, layout,
  geometry, and hit-testing behavior with Chromium.
- `pnpm run css:check`: validate and generate the CSS support inventory.
- `pnpm run build`: verify publishing-facing changes.
- `pnpm run test:package`: build and exercise the packed npm artifact.
- `pnpm run examples:check`: build the package and validate every example.

Keep unit and Chromium parity responsibilities separate. Browser-observable
layout behavior belongs in browser parity tests; lifecycle, invalidation,
injected measurement, policy routing, metadata, and debug contracts belong in
unit tests.

## Prepare the pull request

Pull requests should include:

- A concise description of the outcome.
- The commands used to validate it.
- Notes about parity or benchmark impact where relevant.
- A note identifying the Changeset when the pull request includes one.

Keep CSS support records in `support/css/` synchronized with CSS parsing,
layout, hit-testing, parity, and support-claim changes. Do not commit generated
directories such as `.cache`, `.tmp`, `.pnpm-store`, `.playwright-browsers`, or
`dist/`.

Follow the commit convention in [README.md](README.md#commit-convention).
