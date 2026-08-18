The example mounts real Ant Design components and portals. DOM Layout Shim is a
test-only attachment; the application does not import it or use an Ant-specific
adapter.

#### 1. Configure happy-dom and React tests

{{source:vitest.config.ts#vitest-config:ts}}

{{source:test/setup.ts#test-setup:ts}}

#### 2. Mount the application normally

{{source:test/task-workspace.test.tsx#mount-react:tsx}}

#### 3. Click where the element is

{{source:test/click-where-element-is.ts#click-where-element-is:ts}}

The utility measures the element's center, asks the document which element owns
that point, and refuses to click through an overlay. It dispatches the event to
the actual hit target so descendants behave like a coordinate-based browser
click. Call it inside React's `act()` to synchronize resulting state updates.

The example ignores unsupported declarations because Ant Design emits many
visual-only rules. Use the default warning policy, or narrow overrides, when
unsupported declarations should remain visible in your own suite.

#### 4. Use geometry-aware assertions

Before opening the modal:

{{source:test/task-workspace.test.tsx#pointer-receives:ts}}

After opening the real Ant Design modal:

{{source:test/task-workspace.test.tsx#pointer-blocked:ts}}

The helpers derive interaction points from element geometry, so the test checks
whether overlays actually cover or expose a control instead of bypassing layout
with a direct `.click()`.
