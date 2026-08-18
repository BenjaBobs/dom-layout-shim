export async function runCompatibilityScenario(driver, scenario) {
  const checkpoints = []

  for (const step of scenario.steps) {
    for (const action of step.actions ?? []) {
      await driver[action.type](action)
    }
    await driver.settle()
    checkpoints.push(await driver.capture(step))
  }

  return { scenario: scenario.id, checkpoints }
}

export function compareCompatibilityRuns(example, scenario, chromium, engine, metadata = {}) {
  const steps = chromium.checkpoints.map((expected, index) => {
    const actual = engine.checkpoints[index]
    const discrepancies = []
    let geometryMatches = 0
    let geometryTotal = 0
    let visibilityMatches = 0
    let visibilityTotal = 0
    let hitMatches = 0
    let hitTotal = 0

    for (const selector of [...new Set([...Object.keys(expected.elements), ...Object.keys(actual.elements)])]) {
      const browserElement = expected.elements[selector]
      const engineElement = actual.elements[selector]
      if (!browserElement || !engineElement) {
        discrepancies.push({ selector, category: 'presence', expected: Boolean(browserElement), actual: Boolean(engineElement) })
        continue
      }

      visibilityTotal += 1
      if (browserElement.visible === engineElement.visible) visibilityMatches += 1
      else discrepancies.push({ selector, category: 'visibility', expected: browserElement.visible, actual: engineElement.visible })

      for (const field of ['x', 'y', 'width', 'height']) {
        geometryTotal += 1
        const difference = round(engineElement.rect[field] - browserElement.rect[field])
        if (Math.abs(difference) <= 1) geometryMatches += 1
        else discrepancies.push({ selector, category: 'geometry', field, expected: browserElement.rect[field], actual: engineElement.rect[field], difference })
      }

      hitTotal += 1
      if (browserElement.centerHit === engineElement.centerHit) hitMatches += 1
      else discrepancies.push({ selector, category: 'hit-testing', expected: browserElement.centerHit, actual: engineElement.centerHit })
    }

    const coverageTotal = new Set([...Object.keys(expected.elements), ...Object.keys(actual.elements)]).size
    const coverageCaptured = Object.keys(expected.elements).filter((selector) => actual.elements[selector]).length
    const scores = {
      coverage: percentage(coverageCaptured, coverageTotal),
      geometry: percentage(geometryMatches, geometryTotal),
      visibility: percentage(visibilityMatches, visibilityTotal),
      hitTesting: percentage(hitMatches, hitTotal),
    }
    scores.overall = average([scores.geometry, scores.visibility, scores.hitTesting])

    return { id: expected.id, label: expected.label, scores, observations: coverageTotal, discrepancies }
  })

  return {
    schemaVersion: 1,
    example,
    scenario: scenario.id,
    generatedAt: new Date().toISOString(),
    metadata,
    summary: {
      steps: steps.length,
      overallAgreement: average(steps.map((step) => step.scores.overall)),
      coverage: average(steps.map((step) => step.scores.coverage)),
      discrepancies: steps.reduce((total, step) => total + step.discrepancies.length, 0),
    },
    steps,
  }
}

export function createDomDriver(document) {
  return {
    async click({ selector }) {
      const element = required(document, selector)
      element.dispatchEvent(new document.defaultView.MouseEvent('mousedown', { bubbles: true }))
      element.dispatchEvent(new document.defaultView.MouseEvent('mouseup', { bubbles: true }))
      element.click()
    },
    async fill({ selector, value }) {
      const element = required(document, selector)
      const prototype = element.tagName === 'TEXTAREA'
        ? document.defaultView.HTMLTextAreaElement.prototype
        : document.defaultView.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value)
      element.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
    },
    async settle() {
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
    async capture(step) {
      return captureDocument(document, step)
    },
  }
}

export function captureDocument(document, step) {
  const elements = {}
  for (const selector of step.observe) {
    const element = document.querySelector(selector)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const style = document.defaultView.getComputedStyle(element)
    elements[selector] = {
      rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
      visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
      centerHit: identifyElement(document.elementFromPoint(center.x, center.y)),
    }
  }
  return { id: step.id, label: step.label, elements }
}

function identifyElement(element) {
  if (!element) return null
  const key = element.closest?.('[data-layout-key]')?.getAttribute('data-layout-key')
  if (key) return `[data-layout-key="${key}"]`
  return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`
}

function required(document, selector) {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Scenario target not found: ${selector}`)
  return element
}

function percentage(value, total) {
  return total === 0 ? 100 : round((value / total) * 100)
}

function average(values) {
  return values.length === 0 ? 100 : round(values.reduce((total, value) => total + value, 0) / values.length)
}

function round(value) {
  return Math.round(value * 100) / 100
}
