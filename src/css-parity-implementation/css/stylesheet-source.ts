import { transform } from 'lightningcss'
import { readDeclaration } from './lightningcss-value-stringifier.ts'
import { readSelectorList } from './selector-parser.ts'
import { applyDeclaration, type SupportedStyle } from './supported-declaration.ts'
import { handleUnsupportedCss, type UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts'

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
    readCssRules(readStyleElementCssText(styleElement), `style-${index}.css`, policy, rules)
  }

  return rules
}

export function documentStylesheetFingerprint(document: Document): string {
  return Array.from(document.querySelectorAll('style'))
    .map((styleElement) => {
      const cssText = readStyleElementCssText(styleElement)
      return `${cssText.length}:${cssText}`
    })
    .join('|')
}

export function applyStyleRules(
  style: SupportedStyle,
  element: Element,
  rules: readonly StyleRule[],
  policy: UnsupportedCssPolicy | undefined,
  rootFontSize?: number,
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
