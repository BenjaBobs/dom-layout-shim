// docs:start test-setup

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  attachLayoutEngine,
  createUnsupportedCssReporter,
} from 'dom-layout-shim';

// Tell React that state updates are intentionally coordinated with `act()`.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// Vitest transforms CSS imports without adding them to happy-dom, so install the
// example's authored stylesheet before the layout engine reads computed styles.
const exampleStyles = await readFile(
  resolve(process.cwd(), 'src/styles.css'),
  'utf8',
);
const style = window.document.createElement('style');
style.textContent = exampleStyles;
window.document.head.append(style);

// Attach once with shared defaults; tests can override only what they exercise.
export const unsupportedCssReporter = createUnsupportedCssReporter();
export const layoutEngine = await attachLayoutEngine({
  window,
  unsupportedCss: {
    default: 'warn',
    onWarning: unsupportedCssReporter.onWarning,
  },
});
// docs:end test-setup
