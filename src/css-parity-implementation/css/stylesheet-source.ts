import { transform } from 'lightningcss'
import { readDeclaration } from './lightningcss-value-stringifier.ts'
import { readSelectorList } from './selector-parser.ts'
import { applyDeclaration, type SupportedStyle } from './supported-declaration.ts'
import { handleUnsupportedCss, type UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts'
import { applyCustomPropertyDeclaration, type CustomProperties } from './custom-properties.ts'

export type StyleRule = {
  selector: string
  declarations: Array<{ property: string; value: string }>
  specificity: number
  order: number
}

type DocumentStylesheetSource = {
  element: Element
  sheet: CSSStyleSheet | null
  type: 'style' | 'external'
  filename: string
}

const stylesheetIds = new WeakMap<StyleSheet, number>()
let nextStylesheetId = 1

export function readStyleRules(
  document: Document,
  policy: UnsupportedCssPolicy | undefined,
  configuredStylesheets: readonly string[] = [],
): StyleRule[] {
  const rules: StyleRule[] = []

  for (const [index, cssText] of configuredStylesheets.entries()) {
    readCssRules(cssText, `configured-style-${index}.css`, policy, rules)
  }

  for (const source of documentStylesheetSources(document)) {
    if (source.sheet?.disabled) {
      continue
    }

    const cssText = readDocumentStylesheetCssText(source, policy)

    if (cssText !== undefined) {
      readCssRules(cssText, source.filename, policy, rules)
    }
  }

  for (const [index, sheet] of adoptedStylesheets(document).entries()) {
    if (sheet.disabled) {
      continue
    }

    const cssText = readCssomRules(sheet, `adopted stylesheet ${index}`, policy)

    if (cssText !== undefined) {
      readCssRules(cssText, `adopted-style-${index}.css`, policy, rules)
    }
  }

  return rules
}

export function documentStylesheetFingerprint(document: Document): string {
  // MutationObserver cannot see CSSOM edits or adoptedStyleSheets assignment.
  // Include sheet identity as well as serialized rules so replacement and
  // reordering invalidate layout even when two sheets have identical content.
  const documentSources = documentStylesheetSources(document).map((source) => {
    const identity = source.sheet ? stylesheetIdentity(source.sheet) : 'none'
    const disabled = source.sheet?.disabled ? 'disabled' : 'enabled'
    const cssText = readDocumentStylesheetCssText(source, undefined, false)
    return fingerprintPart(source.type, identity, disabled, cssText ?? 'inaccessible')
  })
  const adoptedSources = adoptedStylesheets(document).map((sheet) => {
    const disabled = sheet.disabled ? 'disabled' : 'enabled'
    const cssText = readCssomRules(sheet, 'adopted stylesheet', undefined, false)
    return fingerprintPart('adopted', stylesheetIdentity(sheet), disabled, cssText ?? 'inaccessible')
  })

  return [...documentSources, ...adoptedSources].join('|')
}

export function applyStyleRules(
  style: SupportedStyle,
  element: Element,
  rules: readonly StyleRule[],
  policy: UnsupportedCssPolicy | undefined,
  rootFontSize?: number,
  customProperties?: CustomProperties,
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
          rootFontSize,
          customProperties,
        })
      }
    })
}

export function applyStylesheetCustomProperties(
  properties: Map<string, string>,
  inherited: CustomProperties,
  element: Element,
  rules: readonly StyleRule[],
  policy: UnsupportedCssPolicy | undefined,
): void {
  for (const rule of rules
    .filter((candidate) => matchesSelector(element, candidate.selector, policy))
    .toSorted(compareStyleRuleCascadeOrder)) {
    for (const declaration of rule.declarations) {
      applyCustomPropertyDeclaration(properties, inherited, declaration.property, declaration.value)
    }
  }
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
          // This transform is collection-only. Returning a rule containing
          // unresolved var() tokens makes Lightning CSS serialize its internal
          // unparsed-token representation, which its Node binding cannot round-trip.
          return []
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

function readStyleElementCssText(styleElement: Element): string {
  const authoredCssText = styleElement.textContent ?? ''
  const sheet = (styleElement as HTMLStyleElement).sheet

  if (!sheet) {
    return authoredCssText
  }

  try {
    const cssomRules = Array.from(sheet.cssRules, (rule) => rule.cssText)

    if (!authoredCssText.trim()) {
      return cssomRules.join('\n')
    }

    const authoredRules = canonicalCssRules(styleElement.ownerDocument, authoredCssText)

    if (
      authoredRules &&
      authoredRules.every((rule, index) => cssomRules[index] === rule)
    ) {
      // Keep authored text intact because CSSOM serialization expands some
      // shorthands into declarations that do not round-trip through our
      // supported subset. CSS-in-JS runtimes append insertRule entries, so
      // only the CSSOM-only suffix needs serialization.
      return [authoredCssText, ...cssomRules.slice(authoredRules.length)].join('\n')
    }

    // Once an authored rule is changed or removed through CSSOM, textContent is
    // stale and cannot describe the live cascade. CSSOM serialization may
    // expand shorthands, but it is the only deterministic source that preserves
    // rule edits and deletions without replaying declarations that no longer
    // exist.
    return cssomRules.join('\n')
  } catch {
    // Accessing cssRules can throw for inaccessible stylesheets. A style
    // element's own text remains the best deterministic source in that case.
    return authoredCssText
  }
}

function documentStylesheetSources(document: Document): DocumentStylesheetSource[] {
  let styleIndex = 0
  let externalIndex = 0

  return Array.from(document.querySelectorAll('style, link'))
    .flatMap((element): DocumentStylesheetSource[] => {
      if (element.localName === 'style') {
        return [{
          element,
          sheet: (element as HTMLStyleElement).sheet,
          type: 'style',
          filename: `style-${styleIndex++}.css`,
        }]
      }

      const link = element as HTMLLinkElement
      const rels = link.rel.toLowerCase().split(/\s+/)

      if (!rels.includes('stylesheet')) {
        return []
      }

      return [{
        element,
        sheet: link.sheet,
        type: 'external',
        filename: `external-style-${externalIndex++}.css`,
      }]
    })
}

function adoptedStylesheets(document: Document): CSSStyleSheet[] {
  return Array.from(document.adoptedStyleSheets ?? [])
}

function readDocumentStylesheetCssText(
  source: DocumentStylesheetSource,
  policy?: UnsupportedCssPolicy,
  reportUnavailable = true,
): string | undefined {
  if (source.type === 'style') {
    return readStyleElementCssText(source.element)
  }

  if (!source.sheet) {
    if (reportUnavailable) {
      reportUnavailableStylesheet(policy, describeExternalStylesheet(source.element), 'is unavailable')
    }
    return undefined
  }

  return readCssomRules(
    source.sheet,
    describeExternalStylesheet(source.element),
    policy,
    reportUnavailable,
  )
}

function readCssomRules(
  sheet: CSSStyleSheet,
  description: string,
  policy?: UnsupportedCssPolicy,
  reportUnavailable = true,
): string | undefined {
  try {
    return Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
  } catch (error) {
    if (reportUnavailable) {
      reportUnavailableStylesheet(
        policy,
        description,
        error instanceof Error ? error.message : String(error),
      )
    }
    return undefined
  }
}

function reportUnavailableStylesheet(
  policy: UnsupportedCssPolicy | undefined,
  description: string,
  detail: string,
): void {
  handleUnsupportedCss(policy, {
    property: 'stylesheet',
    value: `${description} ${detail}`,
    reason: 'unsupported-rule',
    source: 'stylesheet',
  })
}

function describeExternalStylesheet(element: Element): string {
  const href = (element as HTMLLinkElement).href || element.getAttribute('href') || '<unknown>'
  return `external stylesheet "${href}"`
}

function stylesheetIdentity(sheet: StyleSheet): number {
  const existing = stylesheetIds.get(sheet)

  if (existing !== undefined) {
    return existing
  }

  const identity = nextStylesheetId++
  stylesheetIds.set(sheet, identity)
  return identity
}

function fingerprintPart(
  type: string,
  identity: string | number,
  disabled: string,
  cssText: string,
): string {
  return `${type}:${identity}:${disabled}:${cssText.length}:${cssText}`
}

function canonicalCssRules(document: Document, cssText: string): string[] | undefined {
  const CSSStyleSheet = document.defaultView?.CSSStyleSheet

  if (!CSSStyleSheet) {
    return undefined
  }

  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(cssText)
    return Array.from(sheet.cssRules, (rule) => rule.cssText)
  } catch {
    return undefined
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
