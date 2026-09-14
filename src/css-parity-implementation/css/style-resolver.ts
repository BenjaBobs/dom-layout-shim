import type {
  UserAgentStyleOptions,
  Viewport,
} from '../../api/layout-engine-config.ts';
import type { UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts';
import {
  applyCascadedStyle,
  type CascadedDeclaration,
  cascadeCustomProperties,
} from './cascade.ts';
import type { CustomProperties } from './custom-properties.ts';
import { collectElementDeclarations } from './element-cascade.ts';
import {
  htmlStyleDeclarations,
  suppressesPrincipalBox,
} from './html-style-defaults.ts';
import { inheritStyle } from './inherited-style.ts';
import type { StyleRule } from './stylesheet-source.ts';
import { createDefaultStyle, type SupportedStyle } from './supported-style.ts';

type Pseudo = 'before' | 'after';
type Resolution = { style: SupportedStyle; customProperties: CustomProperties };

/** The only style-construction entry point available to formatting contexts. */
export type ResolvedStyles = {
  element(element: Element): SupportedStyle;
  pseudo(element: Element, pseudo: Pseudo): SupportedStyle;
  get(element: Element): SupportedStyle | undefined;
};

export type StyleResolver = ResolvedStyles & {
  complete(elements: readonly Element[]): ResolvedStyles;
  anonymous(parent: SupportedStyle): SupportedStyle;
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
    }
    const root = element.ownerDocument.documentElement;
    const rootFontSize =
      !root || root === element ? 16 : resolve(root).style.fontSize;
    // Match and parse once. Variables and ordinary declarations must consume
    // the same selected sources, priorities, and diagnostic context.
    const defaults = pseudo
      ? undefined
      : htmlStyleDeclarations(element, options.profile);
    const declarationContext = {
      element,
      policy: options.policy,
      rootFontSize,
      viewport: options.viewport,
      source: 'stylesheet' as const,
    };
    const declarations: CascadedDeclaration[] = [
      ...(defaults?.userAgent ?? []).map(declaration => ({
        ...declaration,
        origin: 'user-agent' as const,
        context: declarationContext,
      })),
      ...(defaults?.presentationalHints ?? []).map(declaration => ({
        ...declaration,
        origin: 'presentational-hint' as const,
        context: declarationContext,
      })),
      ...collectElementDeclarations(
        element,
        options.userAgentRules,
        options.rules,
        options.policy,
        rootFontSize,
        options.viewport,
        pseudo,
      ),
    ];
    const customProperties = cascadeCustomProperties(
      parent?.customProperties ?? new Map(),
      declarations,
    );
    applyCascadedStyle(style, declarations, customProperties);
    // Blockification is a computed-display rule shared by elements and pseudos.
    // display:contents ancestors do not establish the item's formatting context.
    if (style.display === 'inline') {
      let container = pseudo ? element : element.parentElement;
      while (container && resolve(container).style.display === 'contents')
        container = container.parentElement;
      const display = container ? resolve(container).style.display : undefined;
      if (
        style.position === 'absolute' ||
        style.position === 'fixed' ||
        display === 'flex' ||
        display === 'grid'
      )
        style.display = 'block';
    }
    if (!pseudo && suppressesPrincipalBox(element)) style.display = 'none';
    const result = { style, customProperties };
    if (pseudo) {
      const entries = pseudos.get(element) ?? {};
      entries[pseudo] = result;
      pseudos.set(element, entries);
    } else elements.set(element, result);
    return result;
  }
  return {
    complete(targets) {
      const styles = new Map<Element, SupportedStyle>();
      const generated = new Map<Element, Record<Pseudo, SupportedStyle>>();
      for (const element of targets) {
        styles.set(element, resolve(element).style);
        generated.set(element, {
          before: hasPseudoRules
            ? resolve(element, 'before').style
            : emptyPseudoStyle,
          after: hasPseudoRules
            ? resolve(element, 'after').style
            : emptyPseudoStyle,
        });
      }
      const required = <T>(value: T | undefined): T => {
        if (value === undefined)
          throw new Error(
            'Snapshot requested a style outside the completed layout',
          );
        return value;
      };
      return {
        element: element => required(styles.get(element)),
        pseudo: (element, pseudo) => required(generated.get(element))[pseudo],
        get: element => styles.get(element),
      };
    },
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
