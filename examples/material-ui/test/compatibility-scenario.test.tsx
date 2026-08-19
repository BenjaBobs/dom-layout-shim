import { writeFile } from 'node:fs/promises';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it } from 'vitest';
import type { ScenarioAction } from '../../../scripts/example-compatibility-core.mjs';
import {
  createDomDriver,
  runCompatibilityScenario,
} from '../../../scripts/example-compatibility-core.mjs';
import { scenario } from '../compatibility/scenario.mjs';
import { TaskWorkspace } from '../src/task-workspace.tsx';
import { unsupportedCssReporter } from './setup.ts';

const output = process.env.EXAMPLE_COMPATIBILITY_ENGINE_OUTPUT;

it.skipIf(!output)(
  'captures the full Material UI compatibility scenario',
  async () => {
    if (!output) throw new Error('Missing compatibility output path');
    document.body.innerHTML = '<div id="app"></div>';
    const container = document.querySelector('#app');
    if (!container) throw new Error('Missing application root');

    const root = createRoot(container);
    await act(async () => root.render(<TaskWorkspace />));
    const dom = createDomDriver(document);
    const driver = {
      ...dom,
      async click(action: ScenarioAction) {
        await act(async () => dom.click(action));
      },
      async fill(action: ScenarioAction) {
        await act(async () => dom.fill(action));
      },
      async settle() {
        await act(async () => dom.settle());
      },
    };
    const result = {
      ...(await runCompatibilityScenario(driver, scenario)),
      unsupportedCss: unsupportedCssReporter.getSummary(),
    };
    await writeFile(output, JSON.stringify(result, null, 2));
    await act(async () => root.unmount());
  },
  15_000,
);
