export async function runCompatibilityScenario(driver, scenario) {
  const checkpoints = []

  for (const step of scenario.steps) {
    for (const action of step.actions ?? []) {
      await driver[action.type](action)
    }
    checkpoints.push(await captureStableCheckpoint(driver, step))
  }

  return { scenario: scenario.id, checkpoints }
}

export function compareCompatibilityRuns(example, scenario, chromium, engine, metadata = {}, supportInventory = []) {
  const steps = chromium.checkpoints.map((expected, index) => {
    const actual = engine.checkpoints[index]
    const discrepancies = []
    let geometryMatches = 0
    let geometryTotal = 0
    let visibilityMatches = 0
    let visibilityTotal = 0
    let hitMatches = 0
    let hitTotal = 0
    let styleMatches = 0
    let styleTotal = 0
    let hitStackMatches = 0
    let hitStackTotal = 0
    const styleInputDifferences = []
    const hitStackDifferences = []

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
        else {
          const relativeDifference = field === 'x' || field === 'y'
            ? round((engineElement.relativeRect ?? engineElement.rect)[field] - (browserElement.relativeRect ?? browserElement.rect)[field])
            : undefined
          discrepancies.push({
            selector,
            category: 'geometry',
            field,
            expected: browserElement.rect[field],
            actual: engineElement.rect[field],
            difference,
            ...(relativeDifference === undefined ? {} : {
              relativeDifference,
              scope: Math.abs(relativeDifference) <= 1 ? 'ancestor-offset' : 'local-layout',
            }),
          })
        }
      }

      for (const property of Object.keys(browserElement.layoutStyles ?? {})) {
        styleTotal += 1
        const browserValue = canonicalLayoutStyleValue(property, browserElement.layoutStyles[property], browserElement.layoutStyles)
        const engineValue = canonicalLayoutStyleValue(property, engineElement.layoutStyles?.[property] ?? '', engineElement.layoutStyles ?? {})
        if (browserValue === engineValue) styleMatches += 1
        else styleInputDifferences.push({
          selector,
          category: 'style-input',
          field: property,
          expected: browserElement.layoutStyles[property],
          actual: engineElement.layoutStyles?.[property] ?? '',
        })
      }

      hitTotal += 1
      if (browserElement.centerHit === engineElement.centerHit) hitMatches += 1
      else discrepancies.push({ selector, category: 'hit-testing', expected: browserElement.centerHit, actual: engineElement.centerHit })

      hitStackTotal += 1
      const browserHitStack = browserElement.centerHitStack ?? [browserElement.centerHit]
      const engineHitStack = engineElement.centerHitStack ?? [engineElement.centerHit]
      if (JSON.stringify(browserHitStack) === JSON.stringify(engineHitStack)) hitStackMatches += 1
      else hitStackDifferences.push({ selector, expected: browserHitStack, actual: engineHitStack })
    }

    const coverageTotal = new Set([...Object.keys(expected.elements), ...Object.keys(actual.elements)]).size
    const coverageCaptured = Object.keys(expected.elements).filter((selector) => actual.elements[selector]).length
    const scores = {
      coverage: percentage(coverageCaptured, coverageTotal),
      geometry: percentage(geometryMatches, geometryTotal),
      visibility: percentage(visibilityMatches, visibilityTotal),
      hitTesting: percentage(hitMatches, hitTotal),
      hitStack: percentage(hitStackMatches, hitStackTotal),
      styleInputs: percentage(styleMatches, styleTotal),
    }
    scores.overall = average([scores.geometry, scores.visibility, scores.hitTesting])

    const discrepantSelectors = new Set(discrepancies.map((discrepancy) => discrepancy.selector))
    const relevantStyleInputDifferences = styleInputDifferences.filter((difference) => discrepantSelectors.has(difference.selector))
    const relevantHitStackDifferences = hitStackDifferences.filter((difference) => discrepantSelectors.has(difference.selector))

    return {
      id: expected.id,
      label: expected.label,
      scores,
      observations: coverageTotal,
      stability: {
        chromium: expected.stability ?? { stable: true, attempts: 1 },
        engine: actual.stability ?? { stable: true, attempts: 1 },
      },
      discrepancies,
      diagnostics: {
        styleInputDifferences: relevantStyleInputDifferences,
        hitStackDifferences: relevantHitStackDifferences,
      },
    }
  })

  const discrepancyGroups = groupDiscrepancies(steps)
  const unsupportedCss = summarizeUnsupportedCss(engine.unsupportedCss, supportInventory)

  return {
    schemaVersion: 2,
    example,
    scenario: scenario.id,
    generatedAt: new Date().toISOString(),
    metadata,
    summary: {
      steps: steps.length,
      overallAgreement: average(steps.map((step) => step.scores.overall)),
      coverage: average(steps.map((step) => step.scores.coverage)),
      discrepancies: steps.reduce((total, step) => total + step.discrepancies.length, 0),
      uniqueDiscrepancies: discrepancyGroups.length,
      unstableCheckpoints: steps.filter((step) => !step.stability.chromium.stable || !step.stability.engine.stable).length,
      styleInputDifferences: steps.reduce((total, step) => total + step.diagnostics.styleInputDifferences.length, 0),
      hitStackDifferences: steps.reduce((total, step) => total + step.diagnostics.hitStackDifferences.length, 0),
    },
    steps,
    discrepancyGroups,
    unsupportedCss,
  }
}

function canonicalLayoutStyleValue(property, value, styles) {
  if (property === 'font-weight') {
    if (value === 'normal') return '400'
    if (value === 'bold') return '700'
  }

  if (property === 'white-space' && value === '') return 'normal'

  if (property === 'line-height') {
    const fontSize = /^(-?\d+(?:\.\d+)?)px$/.exec(styles['font-size'] ?? '')
    const unitless = /^(-?\d+(?:\.\d+)?)$/.exec(value)
    const pixels = /^(-?\d+(?:\.\d+)?)px$/.exec(value)
    if (unitless && fontSize) return `${round(Number(unitless[1]) * Number(fontSize[1]))}px`
    if (pixels) return `${round(Number(pixels[1]))}px`
  }

  return value
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
    const parentRect = element.parentElement?.getBoundingClientRect()
    elements[selector] = {
      rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
      relativeRect: {
        x: round(rect.x - (parentRect?.x ?? 0)),
        y: round(rect.y - (parentRect?.y ?? 0)),
        width: round(rect.width),
        height: round(rect.height),
      },
      parent: identifyElement(element.parentElement),
      ancestors: captureAncestors(element),
      layoutStyles: captureLayoutStyles(style),
      text: captureText(element, style),
      visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
      centerHit: identifyElement(document.elementFromPoint(center.x, center.y)),
      centerHitStack: Array.from(document.elementsFromPoint(center.x, center.y)).slice(0, 8).map(identifyElement),
    }
  }
  return { id: step.id, label: step.label, elements }
}

export const layoutStyleProperties = [
  'display', 'position', 'box-sizing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'flex-direction', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-wrap',
  'justify-content', 'align-items', 'align-self', 'gap', 'row-gap', 'column-gap',
  'overflow', 'overflow-x', 'overflow-y',
  'top', 'right', 'bottom', 'left', 'z-index', 'pointer-events',
  'font-family', 'font-size', 'font-weight', 'line-height', 'white-space',
]

function captureLayoutStyles(style) {
  return Object.fromEntries(layoutStyleProperties.map((property) => [property, style.getPropertyValue(property)]))
}

function captureAncestors(element) {
  const ancestors = []
  for (let ancestor = element.parentElement; ancestor && ancestors.length < 8; ancestor = ancestor.parentElement) {
    const rect = ancestor.getBoundingClientRect()
    ancestors.push({
      element: identifyElement(ancestor),
      rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
    })
  }
  return ancestors
}

function captureText(element, style) {
  const rects = Array.from(element.getClientRects()).slice(0, 12).map((rect) => ({
    x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height),
  }))
  return {
    characters: element.textContent?.length ?? 0,
    clientRects: rects,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
  }
}

async function captureStableCheckpoint(driver, step, maximumAttempts = 5) {
  let previousKey
  let checkpoint
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    await driver.settle()
    checkpoint = await driver.capture(step)
    const key = stabilityKey(checkpoint)
    if (key === previousKey) return { ...checkpoint, stability: { stable: true, attempts: attempt } }
    previousKey = key
  }
  return { ...checkpoint, stability: { stable: false, attempts: maximumAttempts } }
}

function stabilityKey(checkpoint) {
  return JSON.stringify(Object.fromEntries(Object.entries(checkpoint.elements).map(([selector, element]) => [selector, {
    rect: element.rect,
    visible: element.visible,
    centerHit: element.centerHit,
    centerHitStack: element.centerHitStack,
  }])))
}

function groupDiscrepancies(steps) {
  const groups = new Map()
  for (const step of steps) {
    for (const discrepancy of step.discrepancies) {
      const key = [discrepancy.selector, discrepancy.category, discrepancy.field ?? '', JSON.stringify(discrepancy.expected), JSON.stringify(discrepancy.actual)].join('\u0000')
      const group = groups.get(key) ?? { ...discrepancy, occurrences: 0, steps: [] }
      group.occurrences += 1
      group.steps.push(step.id)
      groups.set(key, group)
    }
  }
  return Array.from(groups.values()).sort((left, right) => right.occurrences - left.occurrences || left.selector.localeCompare(right.selector))
}

function summarizeUnsupportedCss(summary = { unsupportedDeclarationCount: 0, declarations: [] }, supportInventory = []) {
  const supportByProperty = new Map()
  for (const record of supportInventory) {
    for (const property of record.subjects?.properties ?? []) {
      const records = supportByProperty.get(property) ?? []
      records.push({ id: record.id, effect: record.effect, status: record.status })
      supportByProperty.set(property, records)
    }
  }
  const properties = new Map()
  for (const declaration of summary.declarations) {
    const property = properties.get(declaration.property) ?? {
      property: declaration.property,
      declarations: 0,
      occurrences: 0,
      values: [],
      reasons: [],
      selectors: [],
      elements: [],
      computedValues: [],
    }
    property.declarations += 1
    property.occurrences += declaration.occurrences ?? 1
    property.values.push(declaration.value)
    property.reasons.push(declaration.reason)
    property.selectors.push(...(declaration.selectors ?? []))
    property.elements.push(...(declaration.elements ?? []))
    property.computedValues.push(...(declaration.computedValues ?? []))
    properties.set(declaration.property, property)
  }
  return {
    unsupportedDeclarationCount: summary.unsupportedDeclarationCount,
    properties: Array.from(properties.values()).map((property) => ({
      ...property,
      values: [...new Set(property.values)].sort(),
      reasons: [...new Set(property.reasons)].sort(),
      selectors: [...new Set(property.selectors)].sort(),
      elements: [...new Set(property.elements)].sort(),
      computedValues: [...new Set(property.computedValues)].sort(),
      support: supportByProperty.get(property.property) ?? [],
      priority: unsupportedCssPriority(property, supportByProperty.get(property.property) ?? []),
    })).sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority) || right.occurrences - left.occurrences || left.property.localeCompare(right.property)),
  }
}

function unsupportedCssPriority(property, support) {
  const effects = new Set(support.map((record) => record.effect))
  if (effects.has('layout') || effects.has('hit-testing')) {
    return property.elements.length > 0 ? 'observed-layout' : 'layout'
  }
  if (effects.has('visual-ignored') || effects.has('accepted-inert')) return 'visual-or-inert'
  if (property.elements.length > 0) return 'observed-unclassified'
  return 'unclassified'
}

function priorityRank(priority) {
  return ['observed-layout', 'layout', 'observed-unclassified', 'unclassified', 'visual-or-inert'].indexOf(priority)
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
