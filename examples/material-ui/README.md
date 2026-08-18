# Material UI task workspace

This example uses Material UI naturally to exercise `dom-layout-shim` in a
realistic consumer setup. It renders a scrollable task list, a portalled action
menu, a confirmation dialog and backdrop, dynamic task deletion, and snackbar
feedback.

The layout-dependent test attaches the engine only through the package's public
`attachLayoutEngine` export. It derives a point from the **Add task** button's
rectangle and verifies that the dialog backdrop, rather than the covered button,
is hit while the dialog is open. A direct `button.click()` would miss that class
of interaction bug.

See [docs/layout-shim-setup.md](docs/layout-shim-setup.md) for the concise
Vitest, React mounting, shim attachment, and first-assertion setup used here.

Run it from the repository root:

```sh
pnpm --filter @dom-layout-shim/example-material-ui test
pnpm --filter @dom-layout-shim/example-material-ui build
pnpm --filter @dom-layout-shim/example-material-ui compatibility
```

The browser-hosted page demonstrates the same application, while the Vitest
suite is the evidence that its layout-dependent workflow runs in happy-dom with
the shim attached.

## Current compatibility note

Material UI renders its visible backdrop inside a full-viewport modal root. The
shim currently returns that root, rather than the backdrop child, as the winning
hit target. The test records this distinction while still proving that the
covered application control cannot receive the pointer. This is an observable
compatibility limitation, not a replacement modal implementation.

The compatibility command runs the full scripted interaction in Chromium and
happy-dom with the shim, then updates `compatibility-report.json`. Agreement
differences are reported without failing the command. See
`test/compatibility-scenario.test.tsx` for the happy-dom scenario entry point.
