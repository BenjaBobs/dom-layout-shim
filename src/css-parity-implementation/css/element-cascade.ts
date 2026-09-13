import type { Viewport } from '../../api/layout-engine-config.ts';
import type { UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts';
import type { CascadedDeclaration } from './cascade.ts';
import { parseDeclarationList } from './declaration-list.ts';
import { matchingRules, type StyleRule } from './stylesheet-source.ts';

export function collectElementDeclarations(
  element: Element,
  userAgentRules: readonly StyleRule[],
  authorRules: readonly StyleRule[],
  policy?: UnsupportedCssPolicy,
  rootFontSize?: number,
  viewport?: Viewport,
  pseudoElement?: 'before' | 'after',
): CascadedDeclaration[] {
  const declarations: CascadedDeclaration[] = [];
  for (const [origin, rules] of [
    ['user-agent', userAgentRules],
    ['author', authorRules],
  ] as const) {
    for (const rule of matchingRules(rules, element, policy)) {
      if (rule.pseudoElement !== pseudoElement) continue;
      for (const declaration of rule.declarations) {
        declarations.push({
          ...declaration,
          origin,
          context: {
            policy,
            source: 'stylesheet',
            selector: rule.selector,
            element,
            rootFontSize,
            viewport,
          },
        });
      }
    }
  }
  if (!pseudoElement) {
    for (const declaration of parseDeclarationList(
      element.getAttribute('style') ?? '',
    )) {
      declarations.push({
        ...declaration,
        origin: 'author',
        context: {
          policy,
          source: 'inline-style',
          element,
          rootFontSize,
          viewport,
        },
      });
    }
  }
  return declarations;
}
