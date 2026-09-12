import type { Viewport } from '../../api/layout-engine-config.ts';
import type { UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts';
import { BoundedCache } from '../bounded-cache.ts';
import {
  applyCustomPropertyDeclaration,
  type CustomProperties,
} from './custom-properties.ts';
import {
  applyDeclaration,
  type SupportedStyle,
} from './supported-declaration.ts';

export function applyInlineStyle(
  style: SupportedStyle,
  element: Element,
  policy: UnsupportedCssPolicy | undefined,
  rootFontSize?: number,
  customProperties?: CustomProperties,
  viewport?: Viewport,
): void {
  const inlineStyle = element.getAttribute('style');

  if (!inlineStyle) {
    return;
  }

  for (const declaration of parseDeclarationBlock(inlineStyle)) {
    applyDeclaration(style, declaration.property, declaration.value, {
      policy,
      source: 'inline-style',
      element,
      rootFontSize,
      viewport,
      customProperties,
    });
  }
}

export function applyInlineCustomProperties(
  properties: Map<string, string>,
  inherited: CustomProperties,
  element: Element,
): void {
  const inlineStyle = element.getAttribute('style');

  if (!inlineStyle) {
    return;
  }

  for (const declaration of parseDeclarationBlock(inlineStyle)) {
    applyCustomPropertyDeclaration(
      properties,
      inherited,
      declaration.property,
      declaration.value,
    );
  }
}

const declarationCache = new BoundedCache<
  ReadonlyArray<{ property: string; value: string }>
>();

export function parseDeclarationBlock(
  block: string,
): ReadonlyArray<{ property: string; value: string }> {
  const cached = declarationCache.get(block);
  if (cached) return cached;
  const declarations = block
    .split(';')
    .map(declaration => declaration.trim())
    .filter(Boolean)
    .map(declaration => {
      const colonIndex = declaration.indexOf(':');

      if (colonIndex === -1) {
        return { property: declaration, value: '', important: false };
      }

      const value = declaration.slice(colonIndex + 1).trim();
      const important = /!\s*important\s*$/i.test(value);

      return {
        important,
        property: declaration.slice(0, colonIndex).trim(),
        value: important
          ? value.replace(/!\s*important\s*$/i, '').trim()
          : value,
      };
    })
    // Importance is declaration metadata, never part of the property value.
    // Apply important declarations last, preserving source order within each tier.
    .sort((a, b) => Number(a.important) - Number(b.important));
  declarationCache.set(block, declarations);
  return declarations;
}
