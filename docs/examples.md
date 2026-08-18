---
title: UI library examples
description: Realistic Material UI and Ant Design workflows tested with DOM Layout Shim.
---

# UI library examples

These task workspaces use real component libraries to exercise geometry, portals,
scrolling, overlays, hit testing, and dynamic layout. The hosted pages run in a
browser; their repository tests run the same workflows in happy-dom with DOM
Layout Shim attached.

[Launch Material UI](./examples/material-ui/)
[Launch Ant Design](./examples/ant-design/)

## Shared task-workspace scenario

Both applications implement the same consumer workflow while using their
library idiomatically:

1. Display tasks in a constrained, scrollable workspace.
2. Open a portalled action menu from a task.
3. Request deletion through a confirmation dialog and backdrop.
4. Prove through coordinate-based hit testing that the backdrop blocks the
   underlying workspace.
5. Close or confirm the dialog and verify layout and reachability update.

## What the examples establish

| Capability | Consumer-visible evidence |
| --- | --- |
| Geometry | Interaction points come from `getBoundingClientRect()`. |
| Hit testing | `elementFromPoint()` selects the visually reachable target. |
| Portals | Menus and dialogs render outside their triggering subtree. |
| Stacking | Modal backdrops prevent access to underlying controls. |
| Invalidation | Opening overlays and deleting tasks recompute layout. |
| Scrolling | Task content lives inside a constrained overflow region. |

These examples complement Chromium parity fixtures. Parity fixtures verify exact
CSS behavior; examples verify that realistic consumer workflows remain useful
when several supported behaviors interact.

## Current compatibility findings

| Library | Known limitation | Structured report |
| --- | --- | --- |
| Material UI | A modal's full-viewport root is the winning hit target rather than its visible backdrop. | [Material UI report](./examples/material-ui/compatibility.json) |
| Ant Design | Dropdown placement resolves outside the viewport, and the flat stacking model places the modal mask above its dialog actions. | [Ant Design report](./examples/ant-design/compatibility.json) |

The automated examples keep these limitations explicit while still exercising
the real library components and event handlers around them.
