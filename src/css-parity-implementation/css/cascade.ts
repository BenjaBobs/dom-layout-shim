import { handleUnsupportedCss } from '../../api/unsupported-css-policy.ts';
import {
  applyDeclaration,
  type DeclarationContext,
} from './apply-declaration.ts';
import {
  applyCustomPropertyDeclaration,
  type CustomProperties,
} from './custom-properties.ts';
import type { CssDeclaration } from './declaration-list.ts';
import type { MutableSupportedStyle as SupportedStyle } from './supported-style.ts';

export type CascadedDeclaration = CssDeclaration & {
  context: DeclarationContext;
  origin: 'user-agent' | 'author';
};

// Input order already expresses specificity, source order, and inline priority
// within each origin. Important declarations reverse origin precedence.
export function orderDeclarations(
  declarations: readonly CascadedDeclaration[],
): CascadedDeclaration[] {
  const rank = (declaration: CascadedDeclaration) =>
    declaration.important
      ? declaration.origin === 'user-agent'
        ? 3
        : 2
      : declaration.origin === 'user-agent'
        ? 0
        : 1;
  return declarations.toSorted((a, b) => rank(a) - rank(b));
}

export function cascadeCustomProperties(
  inherited: CustomProperties,
  declarations: readonly CascadedDeclaration[],
): Map<string, string> {
  const properties = new Map(inherited);
  for (const declaration of orderDeclarations(declarations)) {
    applyCustomPropertyDeclaration(
      properties,
      inherited,
      declaration.property,
      declaration.value,
    );
  }
  return properties;
}

export function applyCascadedStyle(
  style: SupportedStyle,
  declarations: readonly CascadedDeclaration[],
  customProperties: CustomProperties,
): void {
  const ordered = orderDeclarations(declarations);
  const inheritedFontSize = style.fontSize;
  const inheritedLineHeight = style.lineHeight;
  // Font-relative values depend on the winning font size, not declaration
  // order. Each font-size candidate resolves against the inheritance parent.
  // Keep applying candidates to preserve invalid-value fallback and diagnostics.
  for (const declaration of ordered) {
    if (declaration.property !== 'font-size') continue;
    const candidate = {
      ...style,
      fontSize: inheritedFontSize,
      lineHeight: inheritedLineHeight,
    };
    let unsupported = false;
    applyDeclaration(candidate, declaration.property, declaration.value, {
      ...declaration.context,
      customProperties,
      policy: {
        property: (_property, context) => {
          unsupported = true;
          handleUnsupportedCss(declaration.context.policy, context);
          return 'ignore';
        },
      },
    });
    if (!unsupported) {
      style.fontSize = candidate.fontSize;
      style.lineHeight = candidate.lineHeight;
    }
  }
  for (const declaration of ordered) {
    if (declaration.property === 'font-size') continue;
    applyDeclaration(style, declaration.property, declaration.value, {
      ...declaration.context,
      customProperties,
    });
  }
}
