import { Features, transform } from 'lightningcss';
import { matchesViewportMediaQuery } from '../../api/layout-engine/viewport-media-query.ts';
import type { Viewport } from '../../api/layout-engine-config.ts';
import {
  handleUnsupportedCss,
  type UnsupportedCssPolicy,
} from '../../api/unsupported-css-policy.ts';
import { BoundedCache } from '../bounded-cache.ts';
import { createDeclarationSourceRecorder } from './authored-declaration-values.ts';
import {
  type CssDeclaration,
  readDeclarationList,
} from './declaration-list.ts';
import { readSelectorList } from './selector-parser.ts';
import {
  releaseStylesheetRevisions,
  stylesheetRevision,
} from './stylesheet-revision.ts';

export type StyleRule = {
  selector: string;
  declarations: CssDeclaration[];
  specificity: number;
  order: number;
  pseudoElement?: 'before' | 'after';
};

export type FontFaceRule = {
  family: string;
  weight: number;
  sources: Array<
    | { type: 'url'; url: string; format?: string }
    | { type: 'local'; name: string }
  >;
};

type DocumentStylesheetSource = {
  element: Element;
  sheet: CSSStyleSheet | null;
  type: 'style' | 'external';
  filename: string;
  authored?: string;
};

const stylesheetIds = new WeakMap<StyleSheet, number>();
let nextStylesheetId = 1;

export type ParsedStylesheet = {
  token?: string;
  ast?: Array<{ type: string; value: unknown }>;
  sourceCss?: string;
  recoveryCss?: string;
  viewportKey?: string;
  rules?: StyleRule[];
};
export type StylesheetParseCache = {
  sources: WeakMap<object, ParsedStylesheet>;
  configured: Map<string, ParsedStylesheet>;
};

export function readStyleRules(
  document: Document,
  policy: UnsupportedCssPolicy | undefined,
  configuredStylesheets: readonly string[] = [],
  viewport?: Viewport,
  cache?: StylesheetParseCache,
): StyleRule[] {
  const rules: StyleRule[] = [];
  const append = (
    parsed: ParsedStylesheet | undefined,
    load: () => string | undefined,
    filename: string,
  ) => {
    const viewportKey = `${viewport?.width}:${viewport?.height}`;
    if (!parsed?.rules || parsed.viewportKey !== viewportKey) {
      const collected: StyleRule[] = [];
      const cssText = parsed?.ast ? '' : load();
      if (cssText !== undefined)
        readCssRules(cssText, filename, policy, collected, viewport, parsed);
      if (parsed) {
        parsed.rules = collected;
        parsed.viewportKey = viewportKey;
      }
      for (const rule of collected)
        rules.push({ ...rule, order: rules.length });
    } else {
      for (const rule of parsed.rules)
        rules.push({ ...rule, order: rules.length });
    }
  };
  for (const [index, text] of configuredStylesheets.entries()) {
    let parsed = cache?.configured.get(text);
    if (cache && !parsed) {
      parsed = {};
      cache.configured.set(text, parsed);
    }
    append(parsed, () => text, `configured-style-${index}.css`);
  }
  for (const source of documentStylesheetSources(document)) {
    if (source.sheet?.disabled) continue;
    const load = () => readDocumentStylesheetCssText(source, policy);
    const token = stylesheetToken(
      document,
      source.sheet,
      source.authored ?? '',
      load,
      source.element,
    );
    let parsed = cache?.sources.get(source.element);
    if (cache && parsed?.token !== token) {
      parsed = { token };
      cache.sources.set(source.element, parsed);
    }
    append(parsed, load, source.filename);
  }
  for (const [index, sheet] of adoptedStylesheets(document).entries()) {
    if (sheet.disabled) continue;
    const load = () =>
      readCssomRules(sheet, `adopted stylesheet ${index}`, policy);
    const token = stylesheetToken(document, sheet, '', load);
    let parsed = cache?.sources.get(sheet);
    if (cache && parsed?.token !== token) {
      parsed = { token };
      cache.sources.set(sheet, parsed);
    }
    append(parsed, load, `adopted-style-${index}.css`);
  }
  return rules;
}

export function readFontFaceRules(
  document: Document,
  configuredStylesheets: readonly string[] = [],
): FontFaceRule[] {
  const rules: FontFaceRule[] = [];

  for (const cssText of configuredStylesheets) {
    collectFontFaceRules(cssText, document.baseURI, rules);
  }

  for (const source of documentStylesheetSources(document)) {
    if (source.sheet?.disabled) continue;
    const cssText = readDocumentStylesheetCssText(source, undefined);
    if (cssText !== undefined) {
      collectFontFaceRules(
        cssText,
        source.sheet?.href ?? document.baseURI,
        rules,
      );
    }
  }

  for (const sheet of adoptedStylesheets(document)) {
    if (sheet.disabled) continue;
    const cssText = readCssomRules(sheet, 'adopted stylesheet', undefined);
    if (cssText !== undefined)
      collectFontFaceRules(cssText, document.baseURI, rules);
  }

  return rules;
}

function collectFontFaceRules(
  cssText: string,
  baseUrl: string,
  rules: FontFaceRule[],
): void {
  try {
    transform({
      filename: baseUrl,
      code: Buffer.from(cssText),
      errorRecovery: true,
      visitor: {
        Rule(rule) {
          if (rule.type === 'font-face') {
            const parsed = parseFontFaceRule(rule.value, baseUrl);
            if (parsed) rules.push(parsed);
          }
          return [];
        },
      },
    });
  } catch {
    // The ordinary stylesheet reader reports parse failures through the CSS
    // policy. Font discovery is deliberately side-effect free.
  }
}

function parseFontFaceRule(
  value: unknown,
  baseUrl: string,
): FontFaceRule | undefined {
  if (!isRecord(value) || !Array.isArray(value.properties)) return undefined;
  let family: string | undefined;
  let weight = 400;
  let sources: FontFaceRule['sources'] = [];

  for (const property of value.properties) {
    if (!isRecord(property) || typeof property.type !== 'string') continue;
    if (property.type === 'font-family' && typeof property.value === 'string')
      family = property.value;
    if (property.type === 'font-weight' && Array.isArray(property.value)) {
      const candidate = property.value[0];
      if (
        isRecord(candidate) &&
        isRecord(candidate.value) &&
        typeof candidate.value.value === 'number'
      ) {
        weight = candidate.value.value;
      }
    }
    if (property.type === 'source' && Array.isArray(property.value)) {
      sources = property.value.flatMap(source =>
        parseFontSource(source, baseUrl),
      );
    }
  }

  return family && sources.length > 0 ? { family, weight, sources } : undefined;
}

function parseFontSource(
  source: unknown,
  baseUrl: string,
): FontFaceRule['sources'] {
  if (!isRecord(source)) return [];
  if (source.type === 'local' && typeof source.value === 'string') {
    return [{ type: 'local', name: source.value }];
  }
  if (!isRecord(source.value)) return [];
  if (
    source.type !== 'url' ||
    !isRecord(source.value.url) ||
    typeof source.value.url.url !== 'string'
  )
    return [];

  let url: string;
  try {
    url = new URL(source.value.url.url, baseUrl).href;
  } catch {
    return [];
  }
  const format =
    isRecord(source.value.format) &&
    typeof source.value.format.type === 'string'
      ? source.value.format.type
      : undefined;
  return [{ type: 'url', url, format }];
}

export function readCssTextRules(
  cssText: string,
  filename: string,
  policy: UnsupportedCssPolicy | undefined,
  viewport?: Viewport,
  cache?: ParsedStylesheet,
): StyleRule[] {
  const rules: StyleRule[] = [];
  readCssRules(cssText, filename, policy, rules, viewport, cache);
  return rules;
}

export function documentStylesheetFingerprint(document: Document): string {
  // Compare small per-sheet tokens, preserving membership and cascade order.
  const documentSources = documentStylesheetSources(document).map(source =>
    stylesheetToken(
      document,
      source.sheet,
      source.authored ?? '',
      () => readDocumentStylesheetCssText(source, undefined, false),
      source.element,
    ),
  );
  const adoptedSources = adoptedStylesheets(document).map(sheet =>
    stylesheetToken(document, sheet, '', () =>
      readCssomRules(sheet, 'adopted stylesheet', undefined, false),
    ),
  );
  return [...documentSources, ...adoptedSources].join('|');
}

const sheetTokens = new WeakMap<
  object,
  {
    revision: number;
    count: number;
    authored: string;
    token: number;
  }
>();
let nextSheetToken = 1;

function stylesheetToken(
  document: Document,
  sheet: CSSStyleSheet | null,
  authored: string,
  fallback: () => string | undefined,
  source?: Element,
): string {
  if (!sheet) return fingerprintPart('missing', 'none', 'enabled', authored);
  const revision = stylesheetRevision(sheet, document);
  if (revision === undefined) {
    return fingerprintPart(
      'fallback',
      stylesheetIdentity(sheet),
      String(sheet.disabled),
      fallback() ?? 'inaccessible',
    );
  }
  const count = sheet.cssRules.length;
  const key = source ?? sheet;
  let cached = sheetTokens.get(key);
  if (
    !cached ||
    cached.revision !== revision ||
    cached.count !== count ||
    cached.authored !== authored
  ) {
    cached = { revision, count, authored, token: nextSheetToken++ };
    sheetTokens.set(key, cached);
  }
  return `${stylesheetIdentity(sheet)}:${Boolean(sheet.disabled)}:${cached.token}`;
}

type RuleSession = {
  general: StyleRule[];
  indexed: Map<string, StyleRule[]>;
  matches: WeakMap<Element, StyleRule[]>;
  rank: Map<StyleRule, number>;
  expandedSelectors: Map<string, string[]>;
};
const ruleSessions = new WeakMap<readonly StyleRule[], RuleSession>();

export function createRuleMatchingSession(
  rules: readonly StyleRule[],
): StyleRule[] {
  const ordered = rules.toSorted(compareStyleRuleCascadeOrder);
  const session: RuleSession = {
    general: [],
    indexed: new Map(),
    matches: new WeakMap(),
    rank: new Map(),
    expandedSelectors: new Map(),
  };
  ordered.forEach((rule, index) => {
    session.rank.set(rule, index);
    // Index only simple, unescaped terminal compounds. Complex selectors keep
    // the full native matching path, so this is a conservative candidate filter.
    const terminal = rule.selector.match(
      /(?:^|[ >+~])([.#]?[a-zA-Z_][\w-]*(?:[.#][a-zA-Z_][\w-]*)*)$/,
    )?.[1];
    const first = terminal?.match(/^([.#]?)([\w-]+)/);
    const key = first
      ? `${first[1] === '.' ? 'class' : first[1] === '#' ? 'id' : 'tag'}:${first[1] ? first[2] : first[2]?.toLowerCase()}`
      : undefined;
    if (!key) session.general.push(rule);
    else {
      const group = session.indexed.get(key) ?? [];
      group.push(rule);
      session.indexed.set(key, group);
    }
  });
  ruleSessions.set(ordered, session);
  return ordered;
}

export function matchingRules(
  rules: readonly StyleRule[],
  element: Element,
  policy: UnsupportedCssPolicy | undefined,
): StyleRule[] {
  const session = ruleSessions.get(rules);
  if (!session)
    return rules
      .filter(rule => matchesSelector(element, rule.selector, policy))
      .toSorted(compareStyleRuleCascadeOrder);
  const cached = session.matches.get(element);
  if (cached) return cached;
  const keys = [
    `tag:${element.localName.toLowerCase()}`,
    `id:${element.id}`,
    ...Array.from(element.classList, name => `class:${name}`),
  ];
  const candidates = [
    ...session.general,
    ...keys.flatMap(key => session.indexed.get(key) ?? []),
  ];
  const selectorMatches = new Map<string, boolean>();
  const matched = candidates
    .filter(rule => {
      let matches = selectorMatches.get(rule.selector);
      if (matches === undefined) {
        matches = matchesSelector(
          element,
          rule.selector,
          policy,
          session.expandedSelectors,
        );
        selectorMatches.set(rule.selector, matches);
      }
      return matches;
    })
    .sort((a, b) => (session.rank.get(a) ?? 0) - (session.rank.get(b) ?? 0));
  session.matches.set(element, matched);
  return matched;
}

function compareStyleRuleCascadeOrder(a: StyleRule, b: StyleRule): number {
  if (a.specificity !== b.specificity) {
    return a.specificity - b.specificity;
  }

  return a.order - b.order;
}

function matchesSelector(
  element: Element,
  selector: string,
  policy: UnsupportedCssPolicy | undefined,
  expandedSelectors?: Map<string, string[]>,
): boolean {
  try {
    // A stylesheet can exceed the shared bounded cache. Keep its active
    // selectors for this pass so each element does not evict the selectors
    // needed by the next (notably Ant Design's scoped CSS-in-JS rules).
    let expanded = expandedSelectors?.get(selector);
    if (!expanded) {
      expanded = expandTopLevelSelectorFunctions(selector);
      expandedSelectors?.set(selector, expanded);
    }
    return expanded.some(candidate => {
      if (candidate.includes(' i]')) {
        return matchesAsciiInsensitiveAttributes(element, candidate);
      }
      return element.matches(candidate);
    });
  } catch {
    handleUnsupportedCss(policy, {
      property: 'selector',
      value: selector,
      reason: 'unsupported-rule',
      source: 'stylesheet',
      selector,
      element,
    });
    return false;
  }
}

// happy-dom can ignore the compound suffix after a false top-level :where()
// or :is(), causing scoped CSS-in-JS rules to match unrelated elements. Expand
// only top-level alternatives and let the host match the resulting ordinary
// selectors; nested functions retain their original boolean semantics.
function expandTopLevelSelectorFunctions(selector: string): string[] {
  const cached = expandedSelectorCache.get(selector);
  if (cached) return cached;

  const functional = findTopLevelSelectorFunction(selector);

  if (!functional) {
    const result = [selector];
    expandedSelectorCache.set(selector, result);
    return result;
  }

  const result = splitSelectorArguments(
    selector.slice(functional.contentStart, functional.contentEnd),
  ).flatMap(argument =>
    expandTopLevelSelectorFunctions(
      selector.slice(0, functional.start) +
        argument.trim() +
        selector.slice(functional.contentEnd + 1),
    ),
  );
  expandedSelectorCache.set(selector, result);
  return result;
}

const expandedSelectorCache = new BoundedCache<string[]>();

function findTopLevelSelectorFunction(
  selector: string,
): { start: number; contentStart: number; contentEnd: number } | undefined {
  let quote: string | undefined;
  let bracketDepth = 0;
  let parenthesisDepth = 0;

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];

    if (character === '\\') {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') bracketDepth += 1;
    if (character === ']') bracketDepth -= 1;

    if (bracketDepth === 0 && parenthesisDepth === 0) {
      const match = selector.slice(index).match(/^:(?:where|is)\(/);
      if (match) {
        const contentStart = index + match[0].length;
        const contentEnd = findClosingParenthesis(selector, contentStart);
        if (contentEnd !== undefined)
          return { start: index, contentStart, contentEnd };
      }
    }

    if (bracketDepth === 0 && character === '(') parenthesisDepth += 1;
    if (bracketDepth === 0 && character === ')') parenthesisDepth -= 1;
  }

  return undefined;
}

function findClosingParenthesis(
  selector: string,
  contentStart: number,
): number | undefined {
  let quote: string | undefined;
  let bracketDepth = 0;
  let depth = 1;

  for (let index = contentStart; index < selector.length; index += 1) {
    const character = selector[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') bracketDepth += 1;
    if (character === ']') bracketDepth -= 1;
    if (bracketDepth !== 0) continue;
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth === 0) return index;
  }

  return undefined;
}

function splitSelectorArguments(value: string): string[] {
  const argumentsList: string[] = [];
  let start = 0;
  let quote: string | undefined;
  let bracketDepth = 0;
  let parenthesisDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') bracketDepth += 1;
    if (character === ']') bracketDepth -= 1;
    if (bracketDepth !== 0) continue;
    if (character === '(') parenthesisDepth += 1;
    if (character === ')') parenthesisDepth -= 1;
    if (character === ',' && parenthesisDepth === 0) {
      argumentsList.push(value.slice(start, index));
      start = index + 1;
    }
  }

  argumentsList.push(value.slice(start));
  return argumentsList;
}

function matchesAsciiInsensitiveAttributes(
  element: Element,
  selector: string,
): boolean {
  const attributes: Array<{ name: string; operator: string; value: string }> =
    [];
  const structuralSelector = selector.replace(
    /\[([\w-]+)(=|~=|\|=|\^=|\$=|\*=)"([^"]*)" i\]/g,
    (_match, name: string, operator: string, value: string) => {
      attributes.push({ name, operator, value: value.toLowerCase() });
      return `[${name}]`;
    },
  );
  if (attributes.length === 0 || !element.matches(structuralSelector))
    return false;

  return attributes.every(({ name, operator, value }) => {
    const actual = element.getAttribute(name)?.toLowerCase();
    if (actual === undefined) return false;
    switch (operator) {
      case '=':
        return actual === value;
      case '~=':
        return actual.split(/\s+/).includes(value);
      case '|=':
        return actual === value || actual.startsWith(`${value}-`);
      case '^=':
        return actual.startsWith(value);
      case '$=':
        return actual.endsWith(value);
      case '*=':
        return actual.includes(value);
      default:
        return false;
    }
  });
}

function readCssRules(
  cssText: string,
  filename: string,
  policy: UnsupportedCssPolicy | undefined,
  rules: StyleRule[],
  viewport: Viewport | undefined,
  cache?: ParsedStylesheet,
): void {
  cssText = cache?.sourceCss ?? cssText;
  let ast = cache?.ast;
  let recoveryCss = cache?.recoveryCss;
  try {
    if (!ast) {
      const collectedAst: Array<{ type: string; value: unknown }> = [];
      ast = collectedAst;
      // Lower nesting before collection: collecting a parent removes its subtree.
      // Lightning CSS preserves the parent-list specificity with :is(), expands
      // nested media rules, and retains declarations authored after nested rules.
      // Keep this separate from the visitor to avoid round-tripping its unparsed
      // var() token objects through the Node binding.
      const declarations: unknown[] = [];
      const recordSource = createDeclarationSourceRecorder(cssText);
      const flattened = transform({
        filename,
        code: Buffer.from(cssText),
        include: Features.Nesting,
        errorRecovery: true,
        visitor: {
          Declaration(declaration) {
            recordSource(declaration);
            // Protect declarations from the lowering pass's shorthand merging
            // and value simplification; collection needs the original AST.
            const index = declarations.push(declaration) - 1;
            return { property: `--layout-nesting-${index}`, raw: '0' };
          },
        },
      });
      const collected = transform({
        filename,
        code: flattened.code,
        errorRecovery: true,
        visitor: {
          Rule(rule) {
            restoreNestingDeclarations(rule, declarations);
            collectedAst.push({
              type: rule.type,
              value: 'value' in rule ? rule.value : undefined,
            });
            return [];
          },
        },
      });
      // Recovery can discard a rule before our visitor sees it. Preserve the
      // authored CSS with the parsed cache so every policy sees that loss.
      if (flattened.warnings.length || collected.warnings.length)
        recoveryCss = cssText;
      if (cache) {
        cache.ast = ast;
        cache.sourceCss = cssText;
        cache.recoveryCss = recoveryCss;
      }
    }
  } catch {
    handleUnsupportedCss(policy, {
      property: 'stylesheet',
      value: cssText,
      reason: 'unsupported-rule',
      source: 'stylesheet',
    });
    return;
  }
  // Policy callbacks and strict-policy errors must escape unchanged, rather
  // than being caught and reported a second time as parser failures.
  if (recoveryCss !== undefined)
    handleUnsupportedCss(policy, {
      property: 'stylesheet',
      value: recoveryCss,
      reason: 'unsupported-rule',
      source: 'stylesheet',
    });
  for (const rule of ast) {
    if (rule.type === 'style')
      collectStyleRule(
        rule.value as Parameters<typeof collectStyleRule>[0],
        policy,
        rules,
      );
    else if (rule.type === 'media')
      collectMediaRule(rule.value, policy, rules, viewport, cssText);
    else if (rule.type !== 'font-face')
      handleUnsupportedCss(policy, {
        property: `@${rule.type}`,
        value: cssText,
        reason: 'unsupported-rule',
        source: 'stylesheet',
      });
  }
}

function restoreNestingDeclarations(
  value: unknown,
  declarations: unknown[],
): void {
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      value[key] = child.map(item => {
        if (
          isRecord(item) &&
          item.property === 'custom' &&
          isRecord(item.value) &&
          typeof item.value.name === 'string' &&
          item.value.name.startsWith('--layout-nesting-')
        ) {
          return declarations[
            Number(item.value.name.slice('--layout-nesting-'.length))
          ];
        }
        restoreNestingDeclarations(item, declarations);
        return item;
      });
    } else {
      restoreNestingDeclarations(child, declarations);
    }
  }
}

function collectMediaRule(
  mediaRule: unknown,
  policy: UnsupportedCssPolicy | undefined,
  rules: StyleRule[],
  viewport: Viewport | undefined,
  cssText: string,
): void {
  if (!isRecord(mediaRule) || !Array.isArray(mediaRule.rules)) {
    reportUnsupportedMediaRule(policy, cssText);
    return;
  }

  const query = stringifyMediaQueryList(mediaRule.query);

  if (viewport === undefined || query === undefined) {
    reportUnsupportedMediaRule(policy, cssText);
    return;
  }

  if (!matchesViewportMediaQuery(query, viewport)) {
    return;
  }

  for (const nestedRule of mediaRule.rules) {
    if (!isRecord(nestedRule) || typeof nestedRule.type !== 'string') {
      reportUnsupportedMediaRule(policy, cssText);
    } else if (nestedRule.type === 'style') {
      collectStyleRule(
        nestedRule.value as Parameters<typeof collectStyleRule>[0],
        policy,
        rules,
      );
    } else if (nestedRule.type === 'media') {
      collectMediaRule(nestedRule.value, policy, rules, viewport, cssText);
    } else {
      handleUnsupportedCss(policy, {
        property: `@${nestedRule.type}`,
        value: cssText,
        reason: 'unsupported-rule',
        source: 'stylesheet',
      });
    }
  }
}

function reportUnsupportedMediaRule(
  policy: UnsupportedCssPolicy | undefined,
  value: string,
): void {
  handleUnsupportedCss(policy, {
    property: '@media',
    value,
    reason: 'unsupported-rule',
    source: 'stylesheet',
  });
}

function stringifyMediaQueryList(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.mediaQueries)) {
    return undefined;
  }

  const queries = value.mediaQueries.map(stringifyMediaQuery);
  return queries.every((query): query is string => query !== undefined)
    ? queries.join(', ')
    : undefined;
}

function stringifyMediaQuery(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.mediaType !== 'string') {
    return undefined;
  }

  const qualifier =
    value.qualifier === 'not' || value.qualifier === 'only'
      ? `${value.qualifier} `
      : '';
  const condition =
    value.condition === null
      ? undefined
      : stringifyMediaCondition(value.condition);

  if (value.condition !== null && condition === undefined) {
    return undefined;
  }

  if (value.mediaType === 'all' && !qualifier && condition) {
    return condition;
  }

  return `${qualifier}${value.mediaType}${condition ? ` and ${condition}` : ''}`;
}

function stringifyMediaCondition(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.type === 'feature') {
    return stringifyMediaFeature(value.value);
  }

  if (
    value.type === 'operation' &&
    value.operator === 'and' &&
    Array.isArray(value.conditions)
  ) {
    const conditions = value.conditions.map(stringifyMediaCondition);
    return conditions.every(
      (condition): condition is string => condition !== undefined,
    )
      ? conditions.join(' and ')
      : undefined;
  }

  return undefined;
}

function stringifyMediaFeature(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return undefined;
  }

  if (
    value.type === 'boolean' &&
    (value.name === 'width' || value.name === 'height')
  ) {
    return `(${value.name})`;
  }

  if (value.type === 'plain') {
    if (
      !['width', 'height', 'orientation', 'aspect-ratio'].includes(value.name)
    ) {
      return undefined;
    }

    const featureValue = stringifyMediaFeatureValue(value.value);
    return featureValue === undefined
      ? undefined
      : `(${value.name}: ${featureValue})`;
  }

  if (value.type === 'range') {
    const operator = {
      equal: '=',
      'less-than': '<',
      'less-than-equal': '<=',
      'greater-than': '>',
      'greater-than-equal': '>=',
    }[String(value.operator)];
    const featureValue = stringifyMediaFeatureValue(value.value);

    if (value.name === 'aspect-ratio') {
      const prefix =
        operator === '>='
          ? 'min-'
          : operator === '<='
            ? 'max-'
            : operator === '='
              ? ''
              : undefined;
      return prefix === undefined || featureValue === undefined
        ? undefined
        : `(${prefix}aspect-ratio: ${featureValue})`;
    }

    if (value.name !== 'width' && value.name !== 'height') {
      return undefined;
    }

    return operator === undefined || featureValue === undefined
      ? undefined
      : `(${value.name} ${operator} ${featureValue})`;
  }

  return undefined;
}

function stringifyMediaFeatureValue(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.type === 'ident' && typeof value.value === 'string') {
    return value.value;
  }

  if (value.type === 'ratio' && Array.isArray(value.value)) {
    const [numerator, denominator] = value.value;
    return typeof numerator === 'number' && typeof denominator === 'number'
      ? `${numerator} / ${denominator}`
      : undefined;
  }

  if (value.type === 'length' && isRecord(value.value)) {
    const length =
      value.value.type === 'value' ? value.value.value : value.value;

    if (
      isRecord(length) &&
      typeof length.value === 'number' &&
      typeof length.unit === 'string'
    ) {
      return `${length.value}${length.unit}`;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStyleElementCssText(styleElement: Element): string {
  const authoredCssText = styleElement.textContent ?? '';
  const sheet = (styleElement as HTMLStyleElement).sheet;

  if (!sheet) {
    return authoredCssText;
  }

  try {
    const cssomRules = Array.from(sheet.cssRules, rule => rule.cssText);

    if (!authoredCssText.trim()) {
      return cssomRules.join('\n');
    }

    const authoredRules = canonicalCssRules(
      styleElement.ownerDocument,
      authoredCssText,
    );

    if (authoredRules?.every((rule, index) => cssomRules[index] === rule)) {
      // Keep authored text intact because CSSOM serialization expands some
      // shorthands into declarations that do not round-trip through our
      // supported subset. CSS-in-JS runtimes append insertRule entries, so
      // only the CSSOM-only suffix needs serialization.
      return [authoredCssText, ...cssomRules.slice(authoredRules.length)].join(
        '\n',
      );
    }

    // Once an authored rule is changed or removed through CSSOM, textContent is
    // stale and cannot describe the live cascade. CSSOM serialization may
    // expand shorthands, but it is the only deterministic source that preserves
    // rule edits and deletions without replaying declarations that no longer
    // exist.
    return cssomRules.join('\n');
  } catch {
    // Accessing cssRules can throw for inaccessible stylesheets. A style
    // element's own text remains the best deterministic source in that case.
    return authoredCssText;
  }
}

const documentSourceCaches = new WeakMap<
  Document,
  { sources?: DocumentStylesheetSource[]; observer: MutationObserver }
>();

function documentStylesheetSources(
  document: Document,
): DocumentStylesheetSource[] {
  let cache = documentSourceCaches.get(document);
  if (!cache && document.defaultView?.MutationObserver) {
    const entry: {
      sources?: DocumentStylesheetSource[];
      observer: MutationObserver;
    } = {
      observer: new document.defaultView.MutationObserver(() => {
        entry.sources = undefined;
      }),
    };
    entry.observer.observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    documentSourceCaches.set(document, entry);
    cache = entry;
  }
  if (cache?.observer.takeRecords().length) cache.sources = undefined;
  if (cache?.sources) return cache.sources;
  let styleIndex = 0;
  let externalIndex = 0;

  const sources = Array.from(document.querySelectorAll('style, link')).flatMap(
    (element): DocumentStylesheetSource[] => {
      if (element.localName === 'style') {
        return [
          {
            element,
            get sheet() {
              return (element as HTMLStyleElement).sheet;
            },
            authored: element.textContent ?? '',
            type: 'style',
            filename: `style-${styleIndex++}.css`,
          },
        ];
      }

      const link = element as HTMLLinkElement;
      const rels = link.rel.toLowerCase().split(/\s+/);

      if (!rels.includes('stylesheet')) {
        return [];
      }

      return [
        {
          element,
          get sheet() {
            return link.sheet;
          },
          type: 'external',
          filename: `external-style-${externalIndex++}.css`,
        },
      ];
    },
  );
  if (cache) cache.sources = sources;
  return sources;
}

function adoptedStylesheets(document: Document): CSSStyleSheet[] {
  return Array.from(document.adoptedStyleSheets ?? []);
}

function readDocumentStylesheetCssText(
  source: DocumentStylesheetSource,
  policy?: UnsupportedCssPolicy,
  reportUnavailable = true,
): string | undefined {
  if (source.type === 'style') {
    return readStyleElementCssText(source.element);
  }

  if (!source.sheet) {
    if (reportUnavailable) {
      reportUnavailableStylesheet(
        policy,
        describeExternalStylesheet(source.element),
        'is unavailable',
      );
    }
    return undefined;
  }

  return readCssomRules(
    source.sheet,
    describeExternalStylesheet(source.element),
    policy,
    reportUnavailable,
  );
}

function readCssomRules(
  sheet: CSSStyleSheet,
  description: string,
  policy?: UnsupportedCssPolicy,
  reportUnavailable = true,
): string | undefined {
  try {
    return Array.from(sheet.cssRules, rule => rule.cssText).join('\n');
  } catch (error) {
    if (reportUnavailable) {
      reportUnavailableStylesheet(
        policy,
        description,
        error instanceof Error ? error.message : String(error),
      );
    }
    return undefined;
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
  });
}

function describeExternalStylesheet(element: Element): string {
  const href =
    (element as HTMLLinkElement).href ||
    element.getAttribute('href') ||
    '<unknown>';
  return `external stylesheet "${href}"`;
}

function stylesheetIdentity(sheet: StyleSheet): number {
  const existing = stylesheetIds.get(sheet);

  if (existing !== undefined) {
    return existing;
  }

  const identity = nextStylesheetId++;
  stylesheetIds.set(sheet, identity);
  return identity;
}

function fingerprintPart(
  type: string,
  identity: string | number,
  disabled: string,
  cssText: string,
): string {
  return `${type}:${identity}:${disabled}:${cssText.length}:${cssText}`;
}

function canonicalCssRules(
  document: Document,
  cssText: string,
): string[] | undefined {
  const CSSStyleSheet = document.defaultView?.CSSStyleSheet;

  if (!CSSStyleSheet) {
    return undefined;
  }

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    return Array.from(sheet.cssRules, rule => rule.cssText);
  } catch {
    return undefined;
  }
}

function collectStyleRule(
  rule: {
    selectors: unknown;
    declarations?: {
      declarations?: unknown[];
      importantDeclarations?: unknown[];
    };
  },
  policy: UnsupportedCssPolicy | undefined,
  rules: StyleRule[],
): void {
  const declarations = readDeclarationList(rule.declarations ?? {});

  for (const selector of readSelectorList(rule.selectors, policy)) {
    rules.push({
      selector: selector.selector,
      declarations,
      specificity: selector.specificity,
      order: rules.length,
      ...(selector.pseudoElement
        ? { pseudoElement: selector.pseudoElement }
        : {}),
    });
  }
}

export function releaseDocumentStylesheets(document: Document): void {
  documentSourceCaches.get(document)?.observer.disconnect();
  documentSourceCaches.delete(document);
  releaseStylesheetRevisions(document);
}
