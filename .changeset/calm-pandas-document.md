---
'dom-layout-shim': patch
---

Update the documentation site with a complete usage guide, syntax-highlighted
code examples, highlighted CSS support search matches, automatic light and dark
themes, and a package changelog that separates pending Changesets under
`Upcoming` from versions confirmed by release tags. Navigation is consistent
and marks the current page, bracket pairs are depth-colored, CSS support results
are relevance-ranked in a denser layout, and changelog commit references link
to their source.

For example, after a feature merges but before its package release, its entry is
shown as:

```text
Upcoming
  Add the newly merged feature.
```

After the release tag is created, the same changelog section is shown under its
published version instead.

For example, searching the CSS support explorer for `flex` now places an exact
property match before records that only mention flex in supporting notes:

```text
Flex layout — exact property match
Display model — supporting evidence match
Grid layout — supporting evidence match
```
