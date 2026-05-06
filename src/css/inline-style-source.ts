import { applyDeclaration, type SupportedStyle } from './supported-declaration.ts'
import type { UnsupportedCssPolicy } from './unsupported-css-policy.ts'

export function applyInlineStyle(
  style: SupportedStyle,
  element: Element,
  policy: UnsupportedCssPolicy | undefined,
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
    })
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
