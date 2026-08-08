# Native-control snapshots

`native-control-sizes.json` keeps two distinct deterministic records:

- `profiles.portable` is the exact observable output required from the engine
  on every host when the portable native-control profile is selected.
- `chromium` records exact output from the pinned Chromium version on each
  named GitHub-hosted runner family. These snapshots detect browser or runner
  drift in CI; local Chromium is not compared because native metrics can differ
  with local fonts and themes even on the same operating system.

The source workflow run and runner image versions are stored with the snapshot.
When an intentional Chromium, runner, or profile update changes a value,
review the exact object diff reported by each matrix job. Update all affected
platform records from the same run so the committed provenance remains
coherent.
