import { writeFile } from 'node:fs/promises'
import { act } from 'react'
import { it } from 'vitest'
import { createDomDriver, runCompatibilityScenario } from '../../../scripts/example-compatibility-core.mjs'
import type { ScenarioAction } from '../../../scripts/example-compatibility-core.mjs'
import { scenario } from '../compatibility/scenario.mjs'
import { mountTaskWorkspace } from '../src/app.tsx'

const output = process.env.EXAMPLE_COMPATIBILITY_ENGINE_OUTPUT

it.skipIf(!output)('captures the full Ant Design compatibility scenario', async () => {
  document.body.innerHTML = '<div id="app"></div>'
  const container = document.querySelector('#app')
  if (!container) throw new Error('Missing application root')

  let root: ReturnType<typeof mountTaskWorkspace> | undefined
  await act(async () => {
    root = mountTaskWorkspace(container)
  })
  const dom = createDomDriver(document)
  const driver = {
    ...dom,
    async click(action: ScenarioAction) {
      await act(async () => dom.click(action))
    },
    async fill(action: ScenarioAction) {
      await act(async () => dom.fill(action))
    },
    async settle() {
      await act(async () => dom.settle())
    },
  }
  const result = await runCompatibilityScenario(driver, scenario)
  await writeFile(output!, JSON.stringify(result, null, 2))
  await act(async () => root?.unmount())
})
