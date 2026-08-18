export type ScenarioAction = {
  type: 'click' | 'fill'
  selector: string
  value?: string
}

export type ScenarioStep = {
  id: string
  label: string
  actions?: ScenarioAction[]
  observe: string[]
}

export type CompatibilityScenario = {
  id: string
  steps: ScenarioStep[]
}

export type ScenarioDriver = {
  click(action: ScenarioAction): Promise<void>
  fill(action: ScenarioAction): Promise<void>
  settle(): Promise<void>
  capture(step: ScenarioStep): Promise<unknown>
}

export function runCompatibilityScenario(driver: ScenarioDriver, scenario: CompatibilityScenario): Promise<unknown>
export function createDomDriver(document: Document): ScenarioDriver
export function captureDocument(document: Document, step: ScenarioStep): unknown
export function compareCompatibilityRuns(example: string, scenario: CompatibilityScenario, chromium: unknown, engine: unknown, metadata?: object): unknown
