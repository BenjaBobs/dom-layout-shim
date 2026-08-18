import { applyDeclaration, type SupportedStyle } from './supported-declaration.ts'
import type { UnsupportedCssPolicy } from '../../api/unsupported-css-policy.ts'
import { applyCustomPropertyDeclaration, type CustomProperties } from './custom-properties.ts'
import type { Viewport } from '../../api/layout-engine-config.ts'

export function applyInlineStyle(
  style: SupportedStyle,
  element: Element,
  policy: UnsupportedCssPolicy | undefined,
  rootFontSize?: number,
  customProperties?: CustomProperties,
  viewport?: Viewport,
): void {
  const inlineStyle = element.getAttribute('style')

  if (!inlineStyle) {
    return
  }

  for (const declaration of parseDeclarationBlock(inlineStyle)) {
    applyDeclaration(style, declaration.property, declaration.value, {
      policy,
      source: 'inline-style',
      element,
      rootFontSize,
      viewport,
      customProperties,
    })
  }
}

export function applyInlineCustomProperties(
  properties: Map<string, string>,
  inherited: CustomProperties,
  element: Element,
): void {
  const inlineStyle = element.getAttribute('style')

  if (!inlineStyle) {
    return
  }

  for (const declaration of parseDeclarationBlock(inlineStyle)) {
    applyCustomPropertyDeclaration(properties, inherited, declaration.property, declaration.value)
  }
}

export function parseDeclarationBlock(block: string): Array<{ property: string; value: string }> {
  return block
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colonIndex = declaration.indexOf(':')

      if (colonIndex === -1) {
        return { property: declaration, value: '' }
      }

      return {
        property: declaration.slice(0, colonIndex).trim(),
        value: declaration.slice(colonIndex + 1).trim(),
      }
    })
}
