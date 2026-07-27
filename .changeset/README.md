# Changesets

Changeset files are short, human-authored descriptions of user-relevant changes.
They are accumulated into a version pull request and ultimately into
`CHANGELOG.md`.

Add one interactively with:

```sh
pnpm run changeset
```

Write for package consumers rather than repeating the commit subject. Explain
the capability, correction, compatibility evidence, or migration requirement
that matters after upgrading.

See `docs/releasing.md` for the release and versioning policy.
