The example uses ordinary Material UI components. DOM Layout Shim is attached
only in the happy-dom test environment; no adapter or production application
change is required.

#### 1. Use happy-dom in Vitest

{{source:vitest.config.ts#vitest-config:ts}}

#### 2. Render React normally

{{source:test/task-workspace.test.tsx#mount-react:tsx}}

#### 3. Attach the layout engine

{{source:test/task-workspace.test.tsx#layout-shim-import+attach-layout-engine:ts}}

The example ignores unsupported declarations because Material UI emits many
visual-only rules. Use the default warning policy, or narrow overrides, when
unsupported declarations should remain visible in your own suite.

#### 4. Assert the reachable element

{{source:test/task-workspace.test.tsx#geometry-assertion:ts}}

The same approach works for Material UI portals: open the real menu or dialog,
then query geometry and hit targets through normal DOM APIs.
