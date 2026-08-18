import type {
  UnsupportedCssContext,
  UnsupportedCssReason,
  UnsupportedCssSource,
} from './unsupported-css-policy.ts'

export type UnsupportedCssSummaryEntry = {
  property: string
  value: string
  reason: UnsupportedCssReason
  sources: readonly UnsupportedCssSource[]
  selectors: readonly string[]
  elements: readonly string[]
  computedValues: readonly string[]
  occurrences: number
}

export type UnsupportedCssSummary = {
  unsupportedDeclarationCount: number
  declarations: readonly UnsupportedCssSummaryEntry[]
}

export type UnsupportedCssReporter = {
  onWarning: (context: UnsupportedCssContext) => void
  getSummary: () => UnsupportedCssSummary
  reset: () => void
}

type MutableSummaryEntry = {
  property: string
  value: string
  reason: UnsupportedCssReason
  sources: Set<UnsupportedCssSource>
  selectors: Set<string>
  elements: Set<string>
  computedValues: Set<string>
  occurrences: number
}

export function createUnsupportedCssReporter(): UnsupportedCssReporter {
  const declarations = new Map<string, MutableSummaryEntry>()

  return {
    onWarning(context) {
      const key = [context.reason, context.property, context.value].join('\u0000')
      const existing = declarations.get(key)

      if (existing) {
        existing.sources.add(context.source)
        if (context.selector) existing.selectors.add(context.selector)
        if (context.element) existing.elements.add(describeElement(context.element))
        const computedValue = readComputedValue(context)
        if (computedValue) existing.computedValues.add(computedValue)
        existing.occurrences += 1
        return
      }

      const computedValue = readComputedValue(context)
      declarations.set(key, {
        property: context.property,
        value: context.value,
        reason: context.reason,
        sources: new Set([context.source]),
        selectors: new Set(context.selector ? [context.selector] : []),
        elements: new Set(context.element ? [describeElement(context.element)] : []),
        computedValues: new Set(computedValue ? [computedValue] : []),
        occurrences: 1,
      })
    },
    getSummary() {
      const entries = Array.from(declarations.values())
        .map((entry): UnsupportedCssSummaryEntry => ({
          property: entry.property,
          value: entry.value,
          reason: entry.reason,
          sources: Array.from(entry.sources).sort(),
          selectors: Array.from(entry.selectors).sort(),
          elements: Array.from(entry.elements).sort(),
          computedValues: Array.from(entry.computedValues).sort(),
          occurrences: entry.occurrences,
        }))
        .sort(compareSummaryEntries)

      return {
        unsupportedDeclarationCount: entries.length,
        declarations: entries,
      }
    },
    reset() {
      declarations.clear()
    },
  }
}

function readComputedValue(context: UnsupportedCssContext): string {
  if (!context.element || context.property.startsWith('@') || context.property === 'selector') return ''
  return context.element.ownerDocument.defaultView?.getComputedStyle(context.element).getPropertyValue(context.property) ?? ''
}

function describeElement(element: Element): string {
  const key = element.closest?.('[data-layout-key]')?.getAttribute('data-layout-key')
  if (key) return `[data-layout-key="${key}"]`
  const id = element.id ? `#${element.id}` : ''
  const className = typeof element.className === 'string' && element.className
    ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
    : ''
  return `${element.tagName.toLowerCase()}${id}${className}`
}

function compareSummaryEntries(
  left: UnsupportedCssSummaryEntry,
  right: UnsupportedCssSummaryEntry,
): number {
  return (
    left.property.localeCompare(right.property) ||
    left.value.localeCompare(right.value) ||
    left.reason.localeCompare(right.reason)
  )
}
