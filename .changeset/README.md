# Changesets

Changeset files are short, human-authored descriptions of user-relevant changes.
They are accumulated into a version pull request and ultimately into
`CHANGELOG.md`.

Every pull request except the generated `Version Packages` pull request must add
or update a Changeset file. The generated pull request consumes the pending
Changesets. For a user-facing change, add one interactively with:

```sh
pnpm run changeset
```

If a pull request has no user-facing release impact, record that decision with:

```sh
pnpm run changeset --empty
```

Empty Changesets do not create a changelog entry or version bump. A follow-up
pull request may update an existing pending Changeset when it refines the same
unreleased change; independent changes should use separate Changesets.

Write for package consumers rather than repeating the commit subject. Explain
the capability, correction, compatibility evidence, or migration requirement
that matters after upgrading.

See `CONTRIBUTING.md` and `docs/releasing.md` for the contribution, release, and
versioning policies.
