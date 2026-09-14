import type {
  MutableSupportedStyle,
  SupportedStyle,
} from './supported-style.ts';

// Exhaustive classification: a new style field cannot silently skip inheritance.
// Elements, pseudos, and anonymous runs all consume this one decision table.
const inheritance = {
  display: 'initial',
  position: 'initial',
  boxSizing: 'initial',
  flexDirection: 'initial',
  flexWrap: 'initial',
  alignItems: 'initial',
  alignSelf: 'initial',
  alignContent: 'initial',
  justifyContent: 'initial',
  justifyItems: 'initial',
  justifySelf: 'initial',
  flexGrow: 'initial',
  flexShrink: 'initial',
  flexBasis: 'initial',
  order: 'initial',
  aspectRatio: 'initial',
  aspectRatioIsHint: 'initial',
  gridAutoFlow: 'initial',
  gridTemplateColumns: 'initial',
  gridTemplateRows: 'initial',
  gridTemplateAreas: 'initial',
  gridTemplateAreaRowCount: 'initial',
  gridTemplateAreaColumnCount: 'initial',
  gridAutoColumns: 'initial',
  gridAutoRows: 'initial',
  gridColumnStart: 'initial',
  gridColumnEnd: 'initial',
  gridRowStart: 'initial',
  gridRowEnd: 'initial',
  captionSide: 'inherited',
  borderCollapse: 'inherited',
  emptyCells: 'inherited',
  tableBorderSpacing: 'inherited',
  width: 'initial',
  height: 'initial',
  minWidth: 'initial',
  minHeight: 'initial',
  maxWidth: 'initial',
  maxHeight: 'initial',
  top: 'initial',
  right: 'initial',
  bottom: 'initial',
  left: 'initial',
  zIndex: 'initial',
  zIndexAuto: 'initial',
  pointerEvents: 'inherited',
  visibility: 'inherited',
  overflowX: 'initial',
  overflowY: 'initial',
  margin: 'initial',
  padding: 'initial',
  rowGap: 'initial',
  columnGap: 'initial',
  borderWidth: 'initial',
  borderStyle: 'initial',
  fontFamily: 'inherited',
  fontSize: 'inherited',
  fontWeight: 'inherited',
  letterSpacing: 'inherited',
  wordSpacing: 'inherited',
  lineHeight: 'inherited',
  whiteSpace: 'inherited',
  textTransform: 'inherited',
  content: 'initial',
  verticalAlign: 'initial',
  transform: 'initial',
  translate: 'initial',
  scale: 'initial',
  transformOrigin: 'initial',
} satisfies Record<keyof SupportedStyle, 'inherited' | 'initial'>;

const inheritedProperties = (
  Object.keys(inheritance) as (keyof SupportedStyle)[]
).filter(property => inheritance[property] === 'inherited');

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
