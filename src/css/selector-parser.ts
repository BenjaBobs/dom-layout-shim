import { handleUnsupportedCss, type UnsupportedCssPolicy } from './unsupported-css-policy.ts'

export type ParsedSelector = {
  selector: string
  specificity: number
}

export function readSelectorList(
  selectors: unknown,
  policy: UnsupportedCssPolicy | undefined,
): ParsedSelector[] {
  if (!Array.isArray(selectors)) {
    handleUnsupportedSelector(String(selectors), policy)
    return []
  }

  return selectors.flatMap((selector) => {
    const result = readSelector(selector, policy)
    return result ? [result] : []
  })
}

function readSelector(
  selector: unknown,
  policy: UnsupportedCssPolicy | undefined,
): ParsedSelector | undefined {
  if (!Array.isArray(selector)) {
    handleUnsupportedSelector(String(selector), policy)
    return undefined
  }

  let result = ''
  let specificity = 0
  let unsupported = false

  for (const component of selector) {
    if (!isSelectorComponent(component)) {
      handleUnsupportedSelector(JSON.stringify(component), policy)
      unsupported = true
      continue
    }

    switch (component.type) {
      case 'type':
        result += component.name
        specificity += 1
        break
      case 'id':
        result += `#${component.name}`
        specificity += 10_000
        break
      case 'class':
        result += `.${component.name}`
        specificity += 100
        break
      case 'universal':
        result += '*'
        break
      case 'attribute': {
        const attributeSelector = readAttributeSelector(component, policy)

        if (!attributeSelector) {
          unsupported = true
          break
        }

        result += attributeSelector
        specificity += 100
        break
      }
      case 'pseudo-class': {
        const pseudoSelector = readFunctionalPseudoSelector(component, policy)

        if (!pseudoSelector) {
          unsupported = true
          break
        }

        result += pseudoSelector.selector
        specificity += pseudoSelector.specificity
        break
      }
      case 'combinator':
        if (component.value === 'descendant') {
          result = `${result.trimEnd()} `
          break
        }

        if (component.value === 'child') {
          result = `${result.trimEnd()} > `
          break
        }

        handleUnsupportedSelector(JSON.stringify(component), policy)
        unsupported = true
        break
      default:
        handleUnsupportedSelector(JSON.stringify(component), policy)
        unsupported = true
    }
  }

  if (unsupported || !result) {
    return undefined
  }

  return { selector: result, specificity }
}

function readFunctionalPseudoSelector(
  component: SelectorComponent,
  policy: UnsupportedCssPolicy | undefined,
): ParsedSelector | undefined {
  if (
    component.kind !== 'where' &&
    component.kind !== 'is' &&
    component.kind !== 'not'
  ) {
    handleUnsupportedSelector(JSON.stringify(component), policy)
    return undefined
  }

  const selectors = readSelectorList(component.selectors, policy)

  if (selectors.length === 0) {
    handleUnsupportedSelector(JSON.stringify(component), policy)
    return undefined
  }

  return {
    selector: `:${component.kind}(${selectors.map((selector) => selector.selector).join(', ')})`,
    specificity:
      component.kind === 'where'
        ? 0
        : Math.max(...selectors.map((selector) => selector.specificity)),
  }
}

function readAttributeSelector(
  component: SelectorComponent,
  policy: UnsupportedCssPolicy | undefined,
): string | undefined {
  if (component.namespace !== null && component.namespace !== undefined) {
    handleUnsupportedSelector(JSON.stringify(component), policy)
    return undefined
  }

  if (!component.name) {
    handleUnsupportedSelector(JSON.stringify(component), policy)
    return undefined
  }

  if (!component.operation) {
    return `[${component.name}]`
  }

  const operator = stringifyAttributeOperator(component.operation.operator)

  if (!operator || typeof component.operation.value !== 'string') {
    handleUnsupportedSelector(JSON.stringify(component), policy)
    return undefined
  }

  if (
    component.operation.caseSensitivity !== undefined &&
    component.operation.caseSensitivity !== 'case-sensitive'
  ) {
    handleUnsupportedSelector(JSON.stringify(component), policy)
    return undefined
  }

  return `[${component.name}${operator}"${escapeAttributeValue(component.operation.value)}"]`
}

function stringifyAttributeOperator(operator: string | undefined): string | undefined {
  switch (operator) {
    case 'equal':
      return '='
    case 'includes':
      return '~='
    case 'dash-match':
      return '|='
    case 'prefix':
      return '^='
    case 'suffix':
      return '$='
    case 'substring':
      return '*='
    default:
      return undefined
  }
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function handleUnsupportedSelector(selector: string, policy: UnsupportedCssPolicy | undefined): void {
  handleUnsupportedCss(policy, {
    property: 'selector',
    value: selector,
    reason: 'unsupported-rule',
    source: 'stylesheet',
    selector,
  })
}

type SelectorComponent = {
  type: string
  name?: string
  value?: string
  kind?: string
  selectors?: unknown
  namespace?: unknown
  operation?: {
    operator?: string
    value?: unknown
    caseSensitivity?: string
  }
}

function isSelectorComponent(value: unknown): value is SelectorComponent {
  return isRecord(value) && typeof value.type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
