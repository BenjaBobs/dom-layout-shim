import {
  applyCustomPropertyDeclaration,
  type CustomProperties,
} from './custom-properties.ts';
import { parseDeclarationList } from './declaration-list.ts';

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

export const parseDeclarationBlock = parseDeclarationList;
