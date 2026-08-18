// docs:start react-test-setup
// Tell React that state updates are intentionally coordinated with `act()`.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
// docs:end react-test-setup
