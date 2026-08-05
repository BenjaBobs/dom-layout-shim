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
}

export function createUnsupportedCssReporter(): UnsupportedCssReporter {
  const declarations = new Map<string, MutableSummaryEntry>()

  return {
    onWarning(context) {
      const key = [context.reason, context.property, context.value].join('\u0000')
      const existing = declarations.get(key)

      if (existing) {
        existing.sources.add(context.source)
        return
      }

      declarations.set(key, {
        property: context.property,
        value: context.value,
        reason: context.reason,
        sources: new Set([context.source]),
      })
    },
    getSummary() {
      const entries = Array.from(declarations.values())
        .map((entry): UnsupportedCssSummaryEntry => ({
          property: entry.property,
          value: entry.value,
          reason: entry.reason,
          sources: Array.from(entry.sources).sort(),
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
