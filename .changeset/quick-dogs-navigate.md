---
'dom-layout-shim': patch
---

Make documentation navigation respond immediately after the initial page load.
The shared shell now swaps internal page content and styles without reloading
the document, while direct URLs, refreshes, Back and Forward navigation, scroll
restoration, page-specific behavior, and no-JavaScript fallback navigation
continue to work normally.

For example, following the `CSS support` navigation link updates the URL and
support explorer in place instead of triggering another document load.
