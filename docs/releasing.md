# Releases and changelogs

DOM Layout Shim uses Changesets to separate development history from release notes.
Commit messages describe repository work. Changesets describe why that work
matters to package consumers.

## When to add a changeset

Every pull request except the generated `Version Packages` pull request must add
or update a Changeset file so its release intent is explicit and reviewable.
The generated release pull request is exempt because it consumes the pending
Changesets.

Add a user-facing Changeset for:

- New supported behavior or public API, normally `minor`.
- A corrected behavior or Chromium mismatch, normally `patch`.
- A breaking change before 1.0, normally `minor` and explicitly described as
  breaking.
- Materially expanded Chromium parity evidence, normally `patch`, when the new
  evidence changes what the project can confidently claim.
- A corrected public compatibility claim, normally `patch`.

Use `pnpm run changeset --empty` for internal refactoring, test reorganization,
tooling, or editorial documentation that does not change a compatibility claim.
Empty Changesets do not create a changelog entry, version bump, or version pull
request when no user-facing Changesets are pending. Automated maintenance pull
requests use the same empty-Changeset path when they have no release impact.

Changesets accumulate between releases. A follow-up pull request may update an
existing pending Changeset when it refines the same unreleased consumer-facing
change. Prefer a new Changeset for an independent change so it can be reviewed,
reverted, and released independently.

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

1. Changes land on `main` with user-facing or empty Changeset files.
2. The release workflow creates or updates a `Version Packages` pull request.
   It explicitly dispatches the required checks because GitHub does not
   recursively trigger workflows for pull requests created by `GITHUB_TOKEN`.
3. Package CI validates the inventory, types, unit tests, Chromium parity,
   build output, and packed file list.
4. Maintainers review and edit the proposed version and `CHANGELOG.md`.
5. Merging that pull request starts a protected `npm` environment deployment.
6. After approval, the deployment repeats the complete validation suite,
   publishes through npm trusted publishing, creates the version tag, and
   creates a GitHub Release from the human-authored changelog section.

The publish job does not use an npm token. npm authenticates the exact
`release.yml` workflow through a short-lived GitHub OIDC identity. Arbitrary
branches and pull requests cannot enter the protected `npm` environment.

The `0.0.0` version is an explicit publication guard. The workflow does not
publish until Changesets prepares the first real version.

The documentation workflow validates and generates the site while the
repository is private. Pages setup, artifact upload, and deployment begin
automatically once the repository is public. Enable Pages with GitHub Actions
as its source in the repository settings before the first public deployment.

Run `pnpm run release:status` to inspect pending changesets and
`pnpm run release:version` to preview the versioning step locally. The version
command consumes pending changeset files, so only run it when intentionally
preparing a release.

## Affected pull request checks

Pull request workflows always report their required check names, but
`scripts/affected-scopes.mjs` skips expensive work that cannot be affected by
the changed paths:

- `package` covers source, unit tests, build inputs, and packed package data.
- `parity` covers source and Chromium parity fixtures or configuration.
- `docs` covers the documentation site and CSS support inventory.
- `release` covers Changesets and repository release automation.

Unknown paths and manual workflow runs select every scope. Changes to the
classifier select every scope as well. Package and parity jobs fail rather than
skip if classification fails, so the optimization cannot silently replace a
required validation result.

The protected release deployment does not use affected scopes. An unpublished
package version always repeats the complete release validation suite before
publishing.

## One-time npm setup

The package must exist on npm before its trusted publisher can be configured.
For the first release:

1. Let Changesets prepare and merge the initial version pull request.
2. From that exact release commit, run all release checks and publish once with
   an npm account protected by two-factor authentication.
3. In the package settings on npmjs.com, configure GitHub Actions as the trusted
   publisher:
   - owner: `BenjaBobs`
   - repository: `dom-layout-shim`
   - workflow: `release.yml`
   - environment: `npm`
   - allowed action: `npm publish`
4. Disable token-based package publication on npm.
5. Re-run the release workflow so it can create any missing tag or GitHub
   Release.

## Repository security settings

Keep repository-wide workflow permissions read-only. The checked-in workflows
grant write access only to the jobs that create version pull requests, deploy
Pages, or publish releases.

Create a GitHub environment named `npm` with:

- Required reviewer: the package owner.
- Deployment branches: selected branch `main` only.
- Administrator bypass disabled.
- No npm token or other long-lived publishing secret.

Protect `main` with a repository ruleset that requires pull requests and the
Changeset intent, Feature branch history, package, Chromium parity, and
documentation status checks. Block force pushes and branch deletion. Enable
private vulnerability reporting, secret scanning, push protection, and
Dependabot security alerts. Do not enable GitHub's `Require linear history`
rule: the repository intentionally permits one merge commit at the `main`
boundary while the Feature branch history check rejects merge commits inside
the pull request itself. Do not grant write access to untrusted contributors;
external contributors can work through forks, whose pull request workflows
receive read-only tokens and no publishing environment access.

All workflow actions are pinned to immutable commit SHAs. Dependabot proposes
reviewable SHA updates for them. If the account plan exposes an Actions policy
requiring full-length SHA pins, enable it as an additional server-side guard.
