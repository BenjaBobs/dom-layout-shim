export type UnsupportedCssDecision = 'ignore' | 'throw'

export type UnsupportedCssReason = 'unknown-property' | 'unsupported-value' | 'unsupported-rule'

export type UnsupportedCssSource = 'inline-style' | 'stylesheet'

export type UnsupportedCssContext = {
  property: string
  value: string
  reason: UnsupportedCssReason
  source: UnsupportedCssSource
  selector?: string
  element?: Element
  defaultDecision: UnsupportedCssDecision
}

export type UnsupportedCssPolicy = {
  default?: UnsupportedCssDecision
  properties?: Record<string, UnsupportedCssDecision>
  property?: (
    property: string,
    context: UnsupportedCssContext,
  ) => UnsupportedCssDecision | undefined
}

export function handleUnsupportedCss(
  policy: UnsupportedCssPolicy | undefined,
  context: Omit<UnsupportedCssContext, 'defaultDecision'>,
): void {
  const defaultDecision = policy?.default ?? 'throw'
  const fullContext: UnsupportedCssContext = {
    ...context,
    defaultDecision,
  }

  const decision =
    policy?.properties?.[context.property] ??
    policy?.property?.(context.property, fullContext) ??
    defaultDecision

  if (decision === 'ignore') {
    return
  }

  const selector = context.selector ? ` in selector "${context.selector}"` : ''
  throw new Error(
    `Unsupported CSS ${context.reason}${selector}: ${context.property}: ${context.value}`,
  )
}
