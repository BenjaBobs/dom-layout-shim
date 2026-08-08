---
'dom-layout-shim': patch
---

Update the documentation site with a complete usage guide, syntax-highlighted
code examples, highlighted CSS support search matches, automatic light and dark
themes, and a package changelog that separates pending Changesets under
`Upcoming` from versions confirmed by release tags. Navigation is consistent
and marks the current page, bracket pairs are depth-colored, CSS support results
are relevance-ranked in a denser layout, and changelog commit references link
to their source. Shared styles, flash-free generated navigation, responsive
menus, visible release context, keyboard focus treatment, and reduced-motion
support keep the experience consistent across pages and devices.

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

Support searches now report the filtered result count, expose labeled and
resettable controls, and give every support area a stable link such as
`css-support-status.html#flex-layout`. Guide navigation follows the currently
visible section and accounts for the sticky header when following a section
link. The changelog likewise keeps the current version visible while scrolling,
links directly to release sections, and can show only minor or patch entries.

The generated website is deployed from an ignored build directory rather than
being bundled into the npm package. Authored Markdown and machine-readable
documentation remain included in the package.
