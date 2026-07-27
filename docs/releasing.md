# Releases and changelogs

test-layout uses Changesets to separate development history from release notes.
Commit messages describe repository work. Changesets describe why that work
matters to package consumers.

## When to add a changeset

Add a changeset for:

- New supported behavior or public API, normally `minor`.
- A corrected behavior or Chromium mismatch, normally `patch`.
- A breaking change before 1.0, normally `minor` and explicitly described as
  breaking.
- Materially expanded Chromium parity evidence, normally `patch`, when the new
  evidence changes what the project can confidently claim.
- A corrected public compatibility claim, normally `patch`.

A changeset is usually unnecessary for internal refactoring, test
reorganization, tooling, or editorial documentation that does not change a
compatibility claim.

## Writing release notes

Summaries must stand on their own without the commit or pull request. Lead with
the user-visible outcome and include constraints or migration guidance where
needed.

Prefer:

```text
Support percentage flex bases in column layouts with a definite container
height.
```

Avoid:

```text
Update flex tests.
```

Parity-only summaries should identify them as evidence rather than implying a
new implementation:

```text
Expand verified Chromium parity coverage for logical min/max sizing and
opposing logical insets.
```

## Version policy before 1.0

- `patch`: fixes, compatibility corrections, and materially improved evidence.
- `minor`: new capabilities and breaking changes.
- `1.0.0`: reserved for a stable public API and documented compatibility
  commitment.

## Release flow

1. Changes land on `main` with changeset files.
2. The release workflow creates or updates a `Version Packages` pull request.
3. Maintainers review and edit the proposed version and `CHANGELOG.md`.
4. Merging that pull request records the versioned release state.
5. Package publication, tags, and GitHub Releases remain disabled while
   `package.json` is private and the project is at `0.0.0`.

Run `pnpm run release:status` to inspect pending changesets and
`pnpm run release:version` to preview the versioning step locally. The version
command consumes pending changeset files, so only run it when intentionally
preparing a release.
