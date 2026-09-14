import type {
  MutableSupportedStyle,
  SupportedStyle,
} from './supported-style.ts';

// All formatting contexts use the same inheritance parent contract, including
// pseudo-elements (originating element) and anonymous runs (block container).
const inheritedProperties = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'wordSpacing',
  'lineHeight',
  'whiteSpace',
  'textTransform',
  'pointerEvents',
  'visibility',
] as const satisfies readonly (keyof SupportedStyle)[];

export function inheritStyle(
  style: MutableSupportedStyle,
  parent: SupportedStyle,
): void {
  Object.assign(
    style,
    Object.fromEntries(
      inheritedProperties.map(property => [property, parent[property]]),
    ),
  );
}
