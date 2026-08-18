# Ant Design task workspace

This example consumes `dom-layout-shim` through its public package API in a
realistic Ant Design application. It implements the shared UI-library
compatibility scenario with a scrollable task list, portalled dropdown menus,
a confirmation modal and backdrop, dynamic deletion, long wrapping text, and a
responsive narrow layout.

The layout-dependent test derives pointer locations from element geometry. It
proves that the modal backdrop blocks an underlying “Add task” control, then
confirms that deleting a task invalidates layout and restores access to that
control after the modal closes. Calling `.click()` directly would bypass that
important overlap check.

See [docs/layout-shim-setup.md](docs/layout-shim-setup.md) for the concise
Vitest, React mounting, shim attachment, and first-assertion setup used here.

## Run locally

From the repository root:

```sh
pnpm --filter @dom-layout-shim/example-ant-design test
pnpm --filter @dom-layout-shim/example-ant-design build
pnpm --filter @dom-layout-shim/example-ant-design exec vite
pnpm --filter @dom-layout-shim/example-ant-design compatibility
```

The browser-hosted page demonstrates the Ant Design application itself. The
Vitest suite is what demonstrates the same workflow in happy-dom with
`dom-layout-shim` attached.

## Current compatibility note

Ant Design's dropdown alignment helper initially parks its portalled popup far
offscreen and does not recover its browser position in happy-dom. The example
therefore opens the real dropdown but invokes the menu item's handler directly
before continuing with geometry-derived modal assertions. Modal/backdrop hit
testing and post-deletion invalidation are exercised normally. The shim's flat
stacking model also places the mask above the dialog buttons, so the test invokes
the real confirmation handler directly after proving that the mask blocks the
application. These are observable compatibility limitations, not replacement
dropdown or modal implementations.

The compatibility command runs the full scripted interaction in Chromium and
happy-dom with the shim, then generates the ignored `compatibility-report.json`
build artifact. Agreement differences are reported without failing the command. See
`test/compatibility-scenario.test.tsx` for the happy-dom scenario entry point.
