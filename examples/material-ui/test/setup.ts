// docs:start test-setup
import { attachLayoutEngine } from 'dom-layout-shim'

// Tell React that state updates are intentionally coordinated with `act()`.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

// Attach once with shared defaults; tests can override only what they exercise.
export const layoutEngine = await attachLayoutEngine({
  window,
  unsupportedCss: { default: 'ignore' },
})
// docs:end test-setup
