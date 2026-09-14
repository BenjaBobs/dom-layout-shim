import type {
  UserAgentStyleOptions,
  Viewport,
} from '../../api/layout-engine-config.ts';
import type { UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts';
import { applyCascadedStyle, cascadeCustomProperties } from './cascade.ts';
import type { CustomProperties } from './custom-properties.ts';
import { collectElementDeclarations } from './element-cascade.ts';
import {
  applyPortableUserAgentDefaults,
  applyPostAuthorStructuralDefaults,
  applyStructuralHtmlDefaults,
} from './html-style-defaults.ts';
import { inheritStyle } from './inherited-style.ts';
import type { StyleRule } from './stylesheet-source.ts';
import { createDefaultStyle, type SupportedStyle } from './supported-style.ts';

type Pseudo = 'before' | 'after';
type Resolution = { style: SupportedStyle; customProperties: CustomProperties };

/** The only style-construction entry point available to formatting contexts. */
export type StyleResolver = {
  element(element: Element): SupportedStyle;
  pseudo(element: Element, pseudo: Pseudo): SupportedStyle;
  anonymous(parent: SupportedStyle): SupportedStyle;
  /** Projection may inspect completed styles, but must not resolve new ones. */
  get(element: Element): SupportedStyle | undefined;
};

export function createStyleResolver(options: {
  rules: readonly StyleRule[];
  userAgentRules: readonly StyleRule[];
  profile: Required<UserAgentStyleOptions>['profile'];
  policy: UnsupportedCssPolicy | undefined;
  viewport: Viewport;
}): StyleResolver {
  const elements = new WeakMap<Element, Resolution>();
  const pseudos = new WeakMap<Element, Partial<Record<Pseudo, Resolution>>>();
  const hasPseudoRules = [...options.rules, ...options.userAgentRules].some(
    rule => rule.pseudoElement !== undefined,
  );
  const emptyPseudoStyle = {
    ...createDefaultStyle(),
    display: 'inline' as const,
  };

  function resolve(element: Element, pseudo?: Pseudo): Resolution {
    const cached = pseudo
      ? pseudos.get(element)?.[pseudo]
      : elements.get(element);
    if (cached) return cached;
    const parent = pseudo
      ? resolve(element)
      : element.parentElement
        ? resolve(element.parentElement)
        : undefined;
    const style = createDefaultStyle();
    if (parent) inheritStyle(style, parent.style);
    if (pseudo) {
      // Generated boxes inherit from their originating element, not its parent.
      style.display = 'inline';
    } else {
      applyStructuralHtmlDefaults(style, element);
      if (options.profile === 'portable')
        applyPortableUserAgentDefaults(style, element);
    }
    const root = element.ownerDocument.documentElement;
    const rootFontSize =
      !root || root === element ? 16 : resolve(root).style.fontSize;
    // Match and parse once. Variables and ordinary declarations must consume
    // the same selected sources, priorities, and diagnostic context.
    const declarations = collectElementDeclarations(
      element,
      options.userAgentRules,
      options.rules,
      options.policy,
      rootFontSize,
      options.viewport,
      pseudo,
    );
    const customProperties = cascadeCustomProperties(
      parent?.customProperties ?? new Map(),
      declarations,
    );
    applyCascadedStyle(style, declarations, customProperties);
    if (pseudo) {
      // Flex/grid items are blockified before entering the backend tree.
      if (
        style.display === 'inline' &&
        (parent?.style.display === 'flex' || parent?.style.display === 'grid')
      )
        style.display = 'block';
    } else {
      applyPostAuthorStructuralDefaults(style, element);
    }
    const result = { style, customProperties };
    if (pseudo) {
      const entries = pseudos.get(element) ?? {};
      entries[pseudo] = result;
      pseudos.set(element, entries);
    } else elements.set(element, result);
    return result;
  }
  return {
    element: element => resolve(element).style,
    pseudo: (element, pseudo) =>
      hasPseudoRules ? resolve(element, pseudo).style : emptyPseudoStyle,
    anonymous(parent) {
      const style = createDefaultStyle();
      inheritStyle(style, parent);
      return style;
    },
    get: element => elements.get(element)?.style,
  };
}
