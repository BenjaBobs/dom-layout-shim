import { transform } from 'lightningcss'
import { applyDeclaration, type SupportedStyle } from './supported-declaration.ts'
import { handleUnsupportedCss, type UnsupportedCssPolicy } from './unsupported-css-policy.ts'

export type StyleRule = {
  selector: string
  declarations: Array<{ property: string; value: string }>
  specificity: number
  order: number
}

export function readStyleRules(
  document: Document,
  policy: UnsupportedCssPolicy | undefined,
  configuredStylesheets: readonly string[] = [],
): StyleRule[] {
  const rules: StyleRule[] = []

  for (const [index, cssText] of configuredStylesheets.entries()) {
    readCssRules(cssText, `configured-style-${index}.css`, policy, rules)
  }

  for (const [index, styleElement] of Array.from(document.querySelectorAll('style')).entries()) {
    readCssRules(styleElement.textContent ?? '', `style-${index}.css`, policy, rules)
  }

  return rules
}

export function applyStyleRules(
  style: SupportedStyle,
  element: Element,
  rules: readonly StyleRule[],
  policy: UnsupportedCssPolicy | undefined,
): void {
  rules
    .filter((rule) => matchesSelector(element, rule.selector, policy))
    .toSorted(compareStyleRuleCascadeOrder)
    .forEach((rule) => {
      for (const declaration of rule.declarations) {
        applyDeclaration(style, declaration.property, declaration.value, {
          policy,
          source: 'stylesheet',
          selector: rule.selector,
          element,
        })
      }
    })
}

function compareStyleRuleCascadeOrder(a: StyleRule, b: StyleRule): number {
  if (a.specificity !== b.specificity) {
    return a.specificity - b.specificity
  }

  return a.order - b.order
}

function matchesSelector(
  element: Element,
  selector: string,
  policy: UnsupportedCssPolicy | undefined,
): boolean {
  try {
    return element.matches(selector)
  } catch {
    handleUnsupportedCss(policy, {
      property: 'selector',
      value: selector,
      reason: 'unsupported-rule',
      source: 'stylesheet',
      selector,
      element,
    })
    return false
  }
}

function readCssRules(
  cssText: string,
  filename: string,
  policy: UnsupportedCssPolicy | undefined,
  rules: StyleRule[],
): void {
  try {
    transform({
      filename,
      code: Buffer.from(cssText),
      errorRecovery: true,
      visitor: {
        Rule(rule) {
          if (rule.type !== 'style') {
            handleUnsupportedCss(policy, {
              property: `@${rule.type}`,
              value: rule.type,
              reason: 'unsupported-rule',
              source: 'stylesheet',
            })
            return []
          }

          collectStyleRule(rule.value, policy, rules)
          return rule
        },
      },
    })
  } catch (error) {
    handleUnsupportedCss(policy, {
      property: 'stylesheet',
      value: error instanceof Error ? error.message : String(error),
      reason: 'unsupported-rule',
      source: 'stylesheet',
    })
  }
}

function collectStyleRule(
  rule: {
    selectors: unknown
    declarations?: {
      declarations?: unknown[]
      importantDeclarations?: unknown[]
    }
  },
  policy: UnsupportedCssPolicy | undefined,
  rules: StyleRule[],
): void {
  const declarations = [
    ...(rule.declarations?.declarations ?? []),
    ...(rule.declarations?.importantDeclarations ?? []),
  ].map(readDeclaration)

  for (const selector of readSelectorList(rule.selectors, policy)) {
    rules.push({
      selector: selector.selector,
      declarations,
      specificity: selector.specificity,
      order: rules.length,
    })
  }
}

function readSelectorList(
  selectors: unknown,
  policy: UnsupportedCssPolicy | undefined,
): Array<{ selector: string; specificity: number }> {
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
): { selector: string; specificity: number } | undefined {
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
): { selector: string; specificity: number } | undefined {
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

function readDeclaration(declaration: unknown): { property: string; value: string } {
  if (!isDeclaration(declaration)) {
    return {
      property: 'unknown',
      value: JSON.stringify(declaration),
    }
  }

  if (declaration.property === 'custom') {
    const custom = declaration.value as { name?: string; value?: unknown[] }

    return {
      property: custom.name ?? 'custom',
      value: stringifyTokens(custom.value ?? []),
    }
  }

  return {
    property: declaration.property,
    value: stringifyCssValue(declaration.property, declaration.value),
  }
}

function stringifyCssValue(property: string, value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (!isRecord(value)) {
    return String(value)
  }

  switch (property) {
    case 'display':
      return stringifyDisplay(value)
    case 'align-content':
    case 'align-items':
    case 'align-self':
    case 'justify-content':
      return stringifyAlignment(value)
    case 'position':
      return typeof value.type === 'string' ? value.type : JSON.stringify(value)
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
    case 'width':
    case 'height':
    case 'min-width':
    case 'min-height':
    case 'max-width':
    case 'max-height':
    case 'font-size':
    case 'line-height':
    case 'flex-grow':
    case 'flex-shrink':
    case 'flex-basis':
      return stringifyLengthLike(value)
    case 'flex':
      return stringifyFlex(value)
    case 'aspect-ratio':
      return stringifyAspectRatio(value)
    case 'grid-template-columns':
    case 'grid-template-rows':
      return stringifyGridTemplate(value)
    case 'grid-column':
    case 'grid-row':
      return stringifyGridLine(value)
    case 'grid-column-start':
    case 'grid-column-end':
    case 'grid-row-start':
    case 'grid-row-end':
      return stringifyGridPlacement(value)
    case 'inset':
      return stringifyInset(value)
    case 'gap':
      return stringifyGap(value)
    case 'padding':
    case 'margin':
    case 'border-width':
    case 'border-style':
      return stringifyEdges(value, property)
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
    case 'row-gap':
    case 'column-gap':
    case 'border-top-width':
    case 'border-right-width':
    case 'border-bottom-width':
    case 'border-left-width':
      return stringifyLengthLike(value)
    case 'z-index':
      return stringifyZIndex(value)
    case 'font-family':
      return Array.isArray(value) ? value.join(', ') : JSON.stringify(value)
    case 'white-space':
      return typeof value === 'string' ? value : JSON.stringify(value)
    default:
      return JSON.stringify(value)
  }
}

function stringifyDisplay(value: Record<string, unknown>): string {
  if (value.type === 'keyword') {
    return String(value.value)
  }

  if (value.type === 'pair') {
    const inside = value.inside

    if (isRecord(inside) && typeof inside.type === 'string' && inside.type !== 'flow') {
      return inside.type
    }

    return String(value.outside)
  }

  return JSON.stringify(value)
}

function stringifyAlignment(value: Record<string, unknown>): string {
  if (typeof value.value === 'string') {
    return value.value
  }

  if (typeof value.type === 'string') {
    return value.type
  }

  return JSON.stringify(value)
}

function stringifyFlex(value: Record<string, unknown>): string {
  const grow = typeof value.grow === 'number' ? String(value.grow) : JSON.stringify(value.grow)
  const shrink = typeof value.shrink === 'number' ? String(value.shrink) : JSON.stringify(value.shrink)
  const basis = isRecord(value.basis) ? stringifyLengthLike(value.basis) : JSON.stringify(value.basis)

  return `${grow} ${shrink} ${basis}`
}

function stringifyAspectRatio(value: Record<string, unknown>): string {
  if (value.auto === true && value.ratio === null) {
    return 'auto'
  }

  if (!Array.isArray(value.ratio)) {
    return JSON.stringify(value)
  }

  const [numerator, denominator] = value.ratio

  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    return JSON.stringify(value)
  }

  return denominator === 1 ? String(numerator) : `${numerator} / ${denominator}`
}

function stringifyGridTemplate(value: Record<string, unknown>): string {
  if (value.type === 'none') {
    return 'none'
  }

  if (value.type !== 'track-list' || !Array.isArray(value.items)) {
    return JSON.stringify(value)
  }

  return value.items.map(stringifyGridTemplateItem).join(' ')
}

function stringifyGridTemplateItem(item: unknown): string {
  if (!isRecord(item) || item.type !== 'track-size' || !isRecord(item.value)) {
    return JSON.stringify(item)
  }

  const trackSize = item.value

  if (trackSize.type === 'track-breadth' && isRecord(trackSize.value)) {
    return stringifyGridTrackBreadth(trackSize.value)
  }

  return JSON.stringify(item)
}

function stringifyGridTrackBreadth(value: Record<string, unknown>): string {
  if (value.type === 'length') {
    return stringifyLength(value.value)
  }

  return JSON.stringify(value)
}

function stringifyGridLine(value: Record<string, unknown>): string {
  const start = stringifyGridPlacement(value.start)
  const end = stringifyGridPlacement(value.end)

  return end === 'auto' ? start : `${start} / ${end}`
}

function stringifyGridPlacement(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'line' && typeof value.index === 'number' && value.name === null) {
    return String(value.index)
  }

  return JSON.stringify(value)
}

function stringifyLengthLike(value: Record<string, unknown>): string {
  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'length-percentage') {
    return stringifyDimensionPercentage(value.value)
  }

  if (value.type === 'length') {
    return stringifyLength(value.value)
  }

  if (value.type === 'number' && typeof value.value === 'number') {
    return String(value.value)
  }

  return JSON.stringify(value)
}

function stringifyDimensionPercentage(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'percentage' && typeof value.value === 'number') {
    return `${value.value * 100}%`
  }

  if (value.type === 'dimension' && isRecord(value.value)) {
    const length = value.value

    if (length.unit === 'px' && typeof length.value === 'number') {
      return `${length.value}px`
    }

    return `${String(length.value)}${String(length.unit)}`
  }

  return JSON.stringify(value)
}

function stringifyLength(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'dimension' && isRecord(value.value)) {
    const length = value.value

    if (length.unit === 'px' && typeof length.value === 'number') {
      return `${length.value}px`
    }

    return `${String(length.value)}${String(length.unit)}`
  }

  if (value.type === 'value' && isRecord(value.value)) {
    const length = value.value

    if (length.unit === 'px' && typeof length.value === 'number') {
      return `${length.value}px`
    }

    return `${String(length.value)}${String(length.unit)}`
  }

  return JSON.stringify(value)
}

function stringifyEdges(value: Record<string, unknown>, property: string): string {
  const sides = [value.top, value.right, value.bottom, value.left].map((side) => {
    if (typeof side === 'string') {
      return side
    }

    return isRecord(side) ? stringifyLengthLike(side) : JSON.stringify(side)
  })

  if (sides.every((side) => side === sides[0])) {
    return sides[0]
  }

  if (sides[0] === sides[2] && sides[1] === sides[3]) {
    return `${sides[0]} ${sides[1]}`
  }

  if (sides[1] === sides[3]) {
    return `${sides[0]} ${sides[1]} ${sides[2]}`
  }

  return property === 'border-style' ? sides.join(' ') : sides.join(' ')
}

function stringifyInset(value: Record<string, unknown>): string {
  const sides = [value.top, value.right, value.bottom, value.left].map(stringifyInsetSide)

  if (sides.every((side) => side === sides[0])) {
    return sides[0]
  }

  return sides.join(' ')
}

function stringifyInsetSide(value: unknown): string {
  return isRecord(value) ? stringifyLengthLike(value) : JSON.stringify(value)
}

function stringifyGap(value: Record<string, unknown>): string {
  const row = stringifyGapSide(value.row)
  const column = stringifyGapSide(value.column)

  return row === column ? row : `${row} ${column}`
}

function stringifyGapSide(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  return isRecord(value) ? stringifyLengthLike(value) : JSON.stringify(value)
}

function stringifyZIndex(value: Record<string, unknown>): string {
  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'integer') {
    return String(value.value)
  }

  return JSON.stringify(value)
}

function stringifyTokens(tokens: unknown[]): string {
  return tokens.map(stringifyToken).join(' ')
}

function stringifyToken(token: unknown): string {
  if (!isRecord(token)) {
    return String(token)
  }

  if (token.type === 'token' && isRecord(token.value)) {
    const value = token.value

    if ('value' in value) {
      return String(value.value)
    }

    if (typeof value.type === 'string') {
      return value.type
    }
  }

  return JSON.stringify(token)
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

function isDeclaration(value: unknown): value is { property: string; value: unknown } {
  return isRecord(value) && typeof value.property === 'string'
}

type SelectorComponent = {
  type: string
  name?: string
  kind?: string
  namespace?: unknown
  value?: string
  selectors?: unknown
  operation?: {
    operator?: string
    value?: unknown
    caseSensitivity?: string
  } | null
}

function isSelectorComponent(value: unknown): value is SelectorComponent {
  return isRecord(value) && typeof value.type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
