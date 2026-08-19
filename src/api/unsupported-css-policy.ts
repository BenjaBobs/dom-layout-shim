export type UnsupportedCssDecision = 'ignore' | 'warn' | 'throw';

export type UnsupportedCssReason =
  | 'unknown-property'
  | 'unsupported-value'
  | 'unsupported-rule';

export type UnsupportedCssSource = 'inline-style' | 'stylesheet';

export type UnsupportedCssContext = {
  property: string;
  value: string;
  reason: UnsupportedCssReason;
  source: UnsupportedCssSource;
  selector?: string;
  element?: Element;
  defaultDecision: UnsupportedCssDecision;
};

export type UnsupportedCssPolicy = {
  default?: UnsupportedCssDecision;
  properties?: Record<string, UnsupportedCssDecision>;
  onWarning?: (context: UnsupportedCssContext) => void;
  property?: (
    property: string,
    context: UnsupportedCssContext,
  ) => UnsupportedCssDecision | undefined;
};

const reportedWarnings = new WeakMap<UnsupportedCssPolicy, Set<string>>();

export function handleUnsupportedCss(
  policy: UnsupportedCssPolicy | undefined,
  context: Omit<UnsupportedCssContext, 'defaultDecision'>,
): void {
  const defaultDecision = policy?.default ?? 'warn';
  const fullContext: UnsupportedCssContext = {
    ...context,
    defaultDecision,
  };

  const decision =
    policy?.properties?.[context.property] ??
    policy?.property?.(context.property, fullContext) ??
    defaultDecision;

  if (decision === 'ignore') {
    return;
  }

  const selector = context.selector ? ` in selector "${context.selector}"` : '';
  const message = `Unsupported CSS ${context.reason}${selector}: ${context.property}: ${context.value}`;

  if (decision === 'throw') {
    throw new Error(message);
  }

  const warningKey = [
    context.reason,
    context.source,
    context.selector ?? '',
    context.property,
    context.value,
  ].join('\u0000');
  const warnings = warningsFor(policy);

  if (warnings.has(warningKey)) {
    return;
  }

  warnings.add(warningKey);

  if (policy?.onWarning) {
    policy.onWarning(fullContext);
    return;
  }

  console.warn(
    `[dom-layout-shim] ${message}. The declaration was ignored and layout may differ. ` +
      `Check support: https://benjabobs.github.io/dom-layout-shim/css-support-status.html?q=${encodeURIComponent(context.property)}`,
  );
}

function warningsFor(policy: UnsupportedCssPolicy | undefined): Set<string> {
  if (!policy) {
    return defaultWarnings;
  }

  const existing = reportedWarnings.get(policy);
  if (existing) {
    return existing;
  }

  const warnings = new Set<string>();
  reportedWarnings.set(policy, warnings);
  return warnings;
}

const defaultWarnings = new Set<string>();
