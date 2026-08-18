The example uses ordinary Material UI components. DOM Layout Shim is attached
only in the happy-dom test environment; no adapter or production application
change is required.

#### 1. Use happy-dom in Vitest

{{source:vitest.config.ts#vitest-config:ts}}

{{source:test/setup.ts#test-setup:ts}}

#### 2. Render React normally

{{source:test/task-workspace.test.tsx#mount-react:tsx}}

#### 3. Click where the element is

{{source:test/click-where-element-is.ts#click-where-element-is:ts}}

The utility measures the element's center, asks the document which element owns
that point, and refuses to click through an overlay. It dispatches the event to
the actual hit target so descendants behave like a coordinate-based browser
click. Call it inside React's `act()` to synchronize resulting state updates.

The example ignores unsupported declarations because Material UI emits many
visual-only rules. Use the default warning policy, or narrow overrides, when
unsupported declarations should remain visible in your own suite.

#### 4. Assert the reachable element

{{source:test/task-workspace.test.tsx#geometry-assertion:ts}}

The same approach works for Material UI portals: open the real menu or dialog,
then query geometry and hit targets through normal DOM APIs.
