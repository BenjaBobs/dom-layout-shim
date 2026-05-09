import { handleUnsupportedCss, type UnsupportedCssPolicy, type UnsupportedCssSource } from './unsupported-css-policy.ts'
import type { WhiteSpace } from '../text/text-measurer.ts'

export type Edges = {
  top: number
  right: number
  bottom: number
  left: number
}

export type BorderStyles = {
  top: 'none' | 'solid'
  right: 'none' | 'solid'
  bottom: 'none' | 'solid'
  left: 'none' | 'solid'
}

type BorderStyleValue = BorderStyles[keyof BorderStyles]

export type AlignItemsValue = 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'stretch'
export type AlignSelfValue = 'auto' | AlignItemsValue
export type JustifyContentValue =
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
export type AlignContentValue = JustifyContentValue | 'stretch'
export type FlexWrapValue = 'nowrap' | 'wrap' | 'wrap-reverse'
export type OverflowValue = 'visible' | 'hidden' | 'clip'
export type SupportedDimension = number | `${number}%`
export type GridTrack = number | `${number}%`
export type GridPlacementValue = 'auto' | number

export type SupportedStyle = {
  display: 'block' | 'flex' | 'grid' | 'none'
  position: 'static' | 'relative' | 'absolute' | 'fixed'
  boxSizing: 'content-box' | 'border-box'
  flexDirection: 'row' | 'column'
  flexWrap: FlexWrapValue
  alignItems?: AlignItemsValue
  alignSelf: AlignSelfValue
  alignContent?: AlignContentValue
  justifyContent?: JustifyContentValue
  justifyItems?: AlignItemsValue
  justifySelf?: AlignSelfValue
  flexGrow: number
  flexShrink: number
  flexBasis?: SupportedDimension
  aspectRatio?: number
  gridTemplateColumns: GridTrack[]
  gridTemplateRows: GridTrack[]
  gridAutoColumns: GridTrack[]
  gridAutoRows: GridTrack[]
  gridColumnStart: GridPlacementValue
  gridColumnEnd: GridPlacementValue
  gridRowStart: GridPlacementValue
  gridRowEnd: GridPlacementValue
  width?: SupportedDimension
  height?: SupportedDimension
  minWidth?: SupportedDimension
  minHeight?: SupportedDimension
  maxWidth?: SupportedDimension
  maxHeight?: SupportedDimension
  top?: number
  right?: number
  bottom?: number
  left?: number
  zIndex: number
  pointerEvents: 'auto' | 'none'
  visibility: 'visible' | 'hidden'
  overflowX: OverflowValue
  overflowY: OverflowValue
  margin: Edges
  padding: Edges
  rowGap: number
  columnGap: number
  borderWidth: Edges
  borderStyle: BorderStyles
  fontFamily: string
  fontSize: number
  lineHeight: number
  whiteSpace: WhiteSpace
}

export type DeclarationContext = {
  policy?: UnsupportedCssPolicy
  source: UnsupportedCssSource
  selector?: string
  element?: Element
}

export function createDefaultStyle(): SupportedStyle {
  return {
    display: 'block',
    position: 'static',
    boxSizing: 'content-box',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignSelf: 'auto',
    flexGrow: 0,
    flexShrink: 1,
    gridTemplateColumns: [],
    gridTemplateRows: [],
    gridAutoColumns: [],
    gridAutoRows: [],
    gridColumnStart: 'auto',
    gridColumnEnd: 'auto',
    gridRowStart: 'auto',
    gridRowEnd: 'auto',
    zIndex: 0,
    pointerEvents: 'auto',
    visibility: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    margin: zeroEdges(),
    padding: zeroEdges(),
    rowGap: 0,
    columnGap: 0,
    borderWidth: zeroEdges(),
    borderStyle: {
      top: 'none',
      right: 'none',
      bottom: 'none',
      left: 'none',
    },
    fontFamily: 'sans-serif',
    fontSize: 16,
    lineHeight: 19.2,
    whiteSpace: 'normal',
  }
}

export function applyDeclaration(
  style: SupportedStyle,
  property: string,
  value: string,
  context: DeclarationContext,
): void {
  const normalizedProperty = property.trim().toLowerCase()
  const normalizedValue = value.trim().toLowerCase()

  if (normalizedProperty.startsWith('--') || isTransitionProperty(normalizedProperty)) {
    return
  }

  switch (normalizedProperty) {
    case 'display':
      applyDisplay(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'position':
      applyKeyword(
        style,
        'position',
        normalizedValue,
        ['static', 'relative', 'absolute', 'fixed'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'box-sizing':
      applyKeyword(
        style,
        'boxSizing',
        normalizedValue,
        ['content-box', 'border-box'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'flex-direction':
      applyKeyword(
        style,
        'flexDirection',
        normalizedValue,
        ['row', 'column'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'flex-wrap':
      applyKeyword(
        style,
        'flexWrap',
        normalizedValue,
        ['nowrap', 'wrap', 'wrap-reverse'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'align-items':
      applyKeyword(
        style,
        'alignItems',
        normalizedValue,
        ['start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'align-self':
      applyKeyword(
        style,
        'alignSelf',
        normalizedValue,
        ['auto', 'start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'align-content':
      applyKeyword(
        style,
        'alignContent',
        normalizedValue,
        ['start', 'end', 'flex-start', 'flex-end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'justify-content':
      applyKeyword(
        style,
        'justifyContent',
        normalizedValue,
        ['start', 'end', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'justify-items':
      applyKeyword(
        style,
        'justifyItems',
        normalizedValue,
        ['start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'justify-self':
      applyKeyword(
        style,
        'justifySelf',
        normalizedValue,
        ['auto', 'start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'place-content':
      applyPlaceContent(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'place-items':
      applyPlaceItems(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'place-self':
      applyPlaceSelf(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'flex-grow':
      applyNumber(style, 'flexGrow', normalizedValue, normalizedProperty, value, context)
      return
    case 'flex-shrink':
      applyNumber(style, 'flexShrink', normalizedValue, normalizedProperty, value, context)
      return
    case 'flex-basis':
      applyFlexBasis(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'flex':
      applyFlexShorthand(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'aspect-ratio':
      applyAspectRatio(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-template-columns':
      applyGridTemplate(style, 'gridTemplateColumns', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-template-rows':
      applyGridTemplate(style, 'gridTemplateRows', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-auto-columns':
      applyGridAutoTracks(style, 'gridAutoColumns', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-auto-rows':
      applyGridAutoTracks(style, 'gridAutoRows', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-column':
      applyGridLine(style, 'gridColumnStart', 'gridColumnEnd', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-row':
      applyGridLine(style, 'gridRowStart', 'gridRowEnd', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-column-start':
      applyGridPlacement(style, 'gridColumnStart', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-column-end':
      applyGridPlacement(style, 'gridColumnEnd', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-row-start':
      applyGridPlacement(style, 'gridRowStart', normalizedValue, normalizedProperty, value, context)
      return
    case 'grid-row-end':
      applyGridPlacement(style, 'gridRowEnd', normalizedValue, normalizedProperty, value, context)
      return
    case 'pointer-events':
      applyKeyword(
        style,
        'pointerEvents',
        normalizedValue,
        ['auto', 'none'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'visibility':
      applyKeyword(
        style,
        'visibility',
        normalizedValue,
        ['visible', 'hidden'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'overflow':
      applyOverflow(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'overflow-x':
      applyKeyword(
        style,
        'overflowX',
        normalizedValue,
        ['visible', 'hidden', 'clip'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'overflow-y':
      applyKeyword(
        style,
        'overflowY',
        normalizedValue,
        ['visible', 'hidden', 'clip'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'opacity':
      applyOpacity(normalizedValue, normalizedProperty, value, context)
      return
    case 'color':
    case 'background-color':
      applyVisualColor(normalizedValue, normalizedProperty, value, context)
      return
    case 'background':
      applyVisualBackground(normalizedValue, normalizedProperty, value, context)
      return
    case 'background-image':
      applyBackgroundImage(normalizedValue, normalizedProperty, value, context)
      return
    case 'background-repeat':
      applyBackgroundRepeat(normalizedValue, normalizedProperty, value, context)
      return
    case 'background-position':
      applyBackgroundPosition(normalizedValue, normalizedProperty, value, context)
      return
    case 'background-size':
      applyBackgroundSize(normalizedValue, normalizedProperty, value, context)
      return
    case 'background-origin':
    case 'background-clip':
      applyBackgroundBox(normalizedValue, normalizedProperty, value, context)
      return
    case 'background-attachment':
      applyBackgroundAttachment(normalizedValue, normalizedProperty, value, context)
      return
    case 'box-shadow':
      applyBoxShadow(normalizedValue, normalizedProperty, value, context)
      return
    case 'border-color':
      applyVisualColors(normalizedValue, normalizedProperty, value, context)
      return
    case 'border-inline-color':
    case 'border-block-color':
      applyVisualColors(normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top-color':
    case 'border-right-color':
    case 'border-bottom-color':
    case 'border-left-color':
    case 'border-inline-start-color':
    case 'border-inline-end-color':
    case 'border-block-start-color':
    case 'border-block-end-color':
    case 'outline-color':
      applyVisualColor(normalizedValue, normalizedProperty, value, context)
      return
    case 'outline':
      applyOutline(normalizedValue, normalizedProperty, value, context)
      return
    case 'outline-width':
      applyOutlineWidth(normalizedValue, normalizedProperty, value, context)
      return
    case 'outline-style':
      applyOutlineStyle(normalizedValue, normalizedProperty, value, context)
      return
    case 'outline-offset':
      applyOutlineOffset(normalizedValue, normalizedProperty, value, context)
      return
    case 'text-decoration':
      applyTextDecoration(normalizedValue, normalizedProperty, value, context)
      return
    case 'text-decoration-line':
      applyTextDecorationLine(normalizedValue, normalizedProperty, value, context)
      return
    case 'text-decoration-color':
      applyVisualColor(normalizedValue, normalizedProperty, value, context)
      return
    case 'text-decoration-style':
      applyKeywordOnly(
        normalizedValue,
        ['solid', 'double', 'dotted', 'dashed', 'wavy'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'text-decoration-thickness':
      applyTextDecorationThickness(normalizedValue, normalizedProperty, value, context)
      return
    case 'filter':
    case 'backdrop-filter':
      applyVisualFilter(normalizedValue, normalizedProperty, value, context)
      return
    case 'transform-origin':
      applyTransformOrigin(normalizedValue, normalizedProperty, value, context)
      return
    case 'will-change':
      applyWillChange(normalizedValue, normalizedProperty, value, context)
      return
    case 'appearance':
      applyKeywordOnly(normalizedValue, ['auto', 'none'], normalizedProperty, value, context)
      return
    case 'accent-color':
    case 'caret-color':
      applyAutoOrVisualColor(normalizedValue, normalizedProperty, value, context)
      return
    case 'scroll-behavior':
      applyKeywordOnly(normalizedValue, ['auto', 'smooth'], normalizedProperty, value, context)
      return
    case 'scrollbar-width':
      applyKeywordOnly(normalizedValue, ['auto', 'thin', 'none'], normalizedProperty, value, context)
      return
    case 'scrollbar-color':
      applyScrollbarColor(normalizedValue, normalizedProperty, value, context)
      return
    case 'overscroll-behavior':
      applyOverscrollBehavior(normalizedValue, normalizedProperty, value, context)
      return
    case 'overscroll-behavior-x':
    case 'overscroll-behavior-y':
      applyKeywordOnly(normalizedValue, ['auto', 'contain', 'none'], normalizedProperty, value, context)
      return
    case 'isolation':
      applyKeywordOnly(normalizedValue, ['auto', 'isolate'], normalizedProperty, value, context)
      return
    case 'mix-blend-mode':
      applyKeywordOnly(normalizedValue, supportedBlendModes, normalizedProperty, value, context)
      return
    case 'list-style':
      applyListStyle(normalizedValue, normalizedProperty, value, context)
      return
    case 'list-style-type':
      applyKeywordOnly(normalizedValue, ['none', 'disc', 'circle', 'square', 'decimal'], normalizedProperty, value, context)
      return
    case 'list-style-position':
      applyKeywordOnly(normalizedValue, ['inside', 'outside'], normalizedProperty, value, context)
      return
    case 'list-style-image':
      applyKeywordOnly(normalizedValue, ['none'], normalizedProperty, value, context)
      return
    case 'forced-color-adjust':
      applyKeywordOnly(normalizedValue, ['auto', 'none', 'preserve-parent-color'], normalizedProperty, value, context)
      return
    case 'color-scheme':
      applyColorScheme(normalizedValue, normalizedProperty, value, context)
      return
    case 'border-radius':
      applyBorderRadius(normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top-left-radius':
    case 'border-top-right-radius':
    case 'border-bottom-right-radius':
    case 'border-bottom-left-radius':
      applyBorderCornerRadius(normalizedValue, normalizedProperty, value, context)
      return
    case 'object-fit':
      applyKeywordOnly(
        normalizedValue,
        ['fill', 'contain', 'cover', 'none', 'scale-down'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'object-position':
      applyObjectPosition(normalizedValue, normalizedProperty, value, context)
      return
    case 'cursor':
      applyKeywordOnly(normalizedValue, supportedCursorKeywords, normalizedProperty, value, context)
      return
    case 'user-select':
      applyKeywordOnly(normalizedValue, ['auto', 'text', 'none', 'contain', 'all'], normalizedProperty, value, context)
      return
    case 'touch-action':
      applyTouchAction(normalizedValue, normalizedProperty, value, context)
      return
    case 'resize':
      applyKeywordOnly(
        normalizedValue,
        ['none', 'both', 'horizontal', 'vertical', 'block', 'inline'],
        normalizedProperty,
        value,
        context,
      )
      return
    case 'inline-size':
      applyLength(style, 'width', normalizedValue, normalizedProperty, value, context)
      return
    case 'block-size':
      applyLength(style, 'height', normalizedValue, normalizedProperty, value, context)
      return
    case 'min-inline-size':
      applyLength(style, 'minWidth', normalizedValue, normalizedProperty, value, context)
      return
    case 'min-block-size':
      applyLength(style, 'minHeight', normalizedValue, normalizedProperty, value, context)
      return
    case 'max-inline-size':
      applyLength(style, 'maxWidth', normalizedValue, normalizedProperty, value, context)
      return
    case 'max-block-size':
      applyLength(style, 'maxHeight', normalizedValue, normalizedProperty, value, context)
      return
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
    case 'width':
    case 'height':
      applyLength(style, normalizedProperty, normalizedValue, normalizedProperty, value, context)
      return
    case 'min-width':
      applyLength(style, 'minWidth', normalizedValue, normalizedProperty, value, context)
      return
    case 'min-height':
      applyLength(style, 'minHeight', normalizedValue, normalizedProperty, value, context)
      return
    case 'max-width':
      applyLength(style, 'maxWidth', normalizedValue, normalizedProperty, value, context)
      return
    case 'max-height':
      applyLength(style, 'maxHeight', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset':
      applyInset(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'inset-inline':
      applyLogicalInset(style, 'inline', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset-block':
      applyLogicalInset(style, 'block', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset-inline-start':
      applyLength(style, 'left', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset-inline-end':
      applyLength(style, 'right', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset-block-start':
      applyLength(style, 'top', normalizedValue, normalizedProperty, value, context)
      return
    case 'inset-block-end':
      applyLength(style, 'bottom', normalizedValue, normalizedProperty, value, context)
      return
    case 'z-index':
      applyZIndex(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'padding':
      applyEdges(style.padding, normalizedValue, normalizedProperty, value, context)
      return
    case 'padding-inline':
      applyLogicalEdges(style.padding, 'inline', normalizedValue, normalizedProperty, value, context, parsePxLength)
      return
    case 'padding-block':
      applyLogicalEdges(style.padding, 'block', normalizedValue, normalizedProperty, value, context, parsePxLength)
      return
    case 'padding-inline-start':
      applyEdge(style.padding, 'left', normalizedValue, normalizedProperty, value, context)
      return
    case 'padding-inline-end':
      applyEdge(style.padding, 'right', normalizedValue, normalizedProperty, value, context)
      return
    case 'padding-block-start':
      applyEdge(style.padding, 'top', normalizedValue, normalizedProperty, value, context)
      return
    case 'padding-block-end':
      applyEdge(style.padding, 'bottom', normalizedValue, normalizedProperty, value, context)
      return
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
      applyEdge(style.padding, edgeNameFromProperty(normalizedProperty), normalizedValue, normalizedProperty, value, context)
      return
    case 'margin':
      applyEdges(style.margin, normalizedValue, normalizedProperty, value, context)
      return
    case 'margin-inline':
      applyLogicalEdges(style.margin, 'inline', normalizedValue, normalizedProperty, value, context, parsePxLength)
      return
    case 'margin-block':
      applyLogicalEdges(style.margin, 'block', normalizedValue, normalizedProperty, value, context, parsePxLength)
      return
    case 'margin-inline-start':
      applyEdge(style.margin, 'left', normalizedValue, normalizedProperty, value, context)
      return
    case 'margin-inline-end':
      applyEdge(style.margin, 'right', normalizedValue, normalizedProperty, value, context)
      return
    case 'margin-block-start':
      applyEdge(style.margin, 'top', normalizedValue, normalizedProperty, value, context)
      return
    case 'margin-block-end':
      applyEdge(style.margin, 'bottom', normalizedValue, normalizedProperty, value, context)
      return
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
      applyEdge(style.margin, edgeNameFromProperty(normalizedProperty), normalizedValue, normalizedProperty, value, context)
      return
    case 'gap':
      applyGap(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'row-gap':
      applyGapLength(style, 'rowGap', normalizedValue, normalizedProperty, value, context)
      return
    case 'column-gap':
      applyGapLength(style, 'columnGap', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-width':
      applyBorderWidths(style.borderWidth, normalizedValue, normalizedProperty, value, context)
      return
    case 'border-inline-width':
      applyLogicalEdges(style.borderWidth, 'inline', normalizedValue, normalizedProperty, value, context, parseBorderWidth)
      return
    case 'border-block-width':
      applyLogicalEdges(style.borderWidth, 'block', normalizedValue, normalizedProperty, value, context, parseBorderWidth)
      return
    case 'border-inline-start-width':
      applyBorderWidthEdge(style.borderWidth, 'left', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-inline-end-width':
      applyBorderWidthEdge(style.borderWidth, 'right', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-block-start-width':
      applyBorderWidthEdge(style.borderWidth, 'top', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-block-end-width':
      applyBorderWidthEdge(style.borderWidth, 'bottom', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top-width':
    case 'border-right-width':
    case 'border-bottom-width':
    case 'border-left-width':
      applyBorderWidthEdge(
        style.borderWidth,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      )
      return
    case 'border-style':
      applyBorderStyles(style.borderStyle, normalizedValue, normalizedProperty, value, context)
      return
    case 'border-inline-style':
      applyLogicalBorderStyles(style.borderStyle, 'inline', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-block-style':
      applyLogicalBorderStyles(style.borderStyle, 'block', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-inline-start-style':
      applyBorderStyle(style.borderStyle, 'left', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-inline-end-style':
      applyBorderStyle(style.borderStyle, 'right', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-block-start-style':
      applyBorderStyle(style.borderStyle, 'top', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-block-end-style':
      applyBorderStyle(style.borderStyle, 'bottom', normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top-style':
    case 'border-right-style':
    case 'border-bottom-style':
    case 'border-left-style':
      applyBorderStyle(
        style.borderStyle,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      )
      return
    case 'border':
      applyBorderShorthand(style, undefined, normalizedValue, normalizedProperty, value, context)
      return
    case 'border-top':
    case 'border-right':
    case 'border-bottom':
    case 'border-left':
      applyBorderShorthand(style, edgeNameFromProperty(normalizedProperty), normalizedValue, normalizedProperty, value, context)
      return
    case 'font-family':
      style.fontFamily = value.trim()
      return
    case 'font-size':
      applyFontSize(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'line-height':
      applyLineHeight(style, normalizedValue, normalizedProperty, value, context)
      return
    case 'white-space':
      applyKeyword(
        style,
        'whiteSpace',
        normalizedValue,
        ['normal', 'pre-wrap', 'nowrap'],
        normalizedProperty,
        value,
        context,
      )
      return
    default:
      handleUnsupportedCss(context.policy, {
        property: normalizedProperty,
        value,
        reason: 'unknown-property',
        source: context.source,
        selector: context.selector,
        element: context.element,
      })
  }
}

function isTransitionProperty(property: string): boolean {
  return (
    property === 'transition' ||
    property === 'transition-property' ||
    property === 'transition-duration' ||
    property === 'transition-timing-function' ||
    property === 'transition-delay' ||
    property === 'transition-behavior'
  )
}

function applyDisplay(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  switch (value) {
    case 'block':
    case 'inline':
    case 'inline-block':
    case 'flow-root':
    case 'list-item':
      style.display = 'block'
      return
    case 'flex':
    case 'inline-flex':
      style.display = 'flex'
      return
    case 'grid':
    case 'inline-grid':
      style.display = 'grid'
      return
    case 'none':
      style.display = 'none'
      return
    default:
      handleUnsupportedCss(context.policy, {
        property,
        value: originalValue,
        reason: 'unsupported-value',
        source: context.source,
        selector: context.selector,
        element: context.element,
      })
  }
}

function applyFontSize(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parsePxLength(value)

  if (length === undefined || length < 0) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const ratio = style.lineHeight / style.fontSize
  style.fontSize = length
  style.lineHeight = ratio * length
}

function applyLineHeight(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const pxLength = parsePxLength(value)

  if (pxLength !== undefined && pxLength >= 0) {
    style.lineHeight = pxLength
    return
  }

  const multiplier = Number(value)

  if (Number.isFinite(multiplier) && multiplier >= 0) {
    style.lineHeight = multiplier * style.fontSize
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyOverflow(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [x, y = x] = parts

  if (isOverflowValue(x) && isOverflowValue(y)) {
    style.overflowX = x
    style.overflowY = y
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isOverflowValue(value: string | undefined): value is OverflowValue {
  return value === 'visible' || value === 'hidden' || value === 'clip'
}

function applyOpacity(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const opacity = Number(value)

  if (Number.isFinite(opacity) && opacity >= 0 && opacity <= 1) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyVisualColor(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (isVisualColorToken(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyVisualColors(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length >= 1 && parts.length <= 4 && parts.every(isVisualColorToken)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyVisualBackground(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || isVisualColorToken(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyBackgroundImage(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || splitCssCommaList(value).every((layer) => layer === 'none')) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyBackgroundRepeat(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || splitCssCommaList(value).every(isBackgroundRepeatLayer)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isBackgroundRepeatLayer(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean)
  const keywords = ['repeat', 'repeat-x', 'repeat-y', 'space', 'round', 'no-repeat']

  return parts.length >= 1 && parts.length <= 2 && parts.every((part) => keywords.includes(part))
}

function applyBackgroundPosition(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || splitCssCommaList(value).every(isPositionLayer)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isPositionLayer(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean)
  return parts.length >= 1 && parts.length <= 4 && parts.every(isObjectPositionPart)
}

function applyBackgroundSize(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || splitCssCommaList(value).every(isBackgroundSizeLayer)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isBackgroundSizeLayer(value: string): boolean {
  if (value === 'cover' || value === 'contain') {
    return true
  }

  const parts = value.split(/\s+/).filter(Boolean)
  return parts.length >= 1 && parts.length <= 2 && parts.every((part) => part === 'auto' || parseNonNegativeDimension(part) !== undefined)
}

function applyBackgroundBox(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const boxes = ['border-box', 'padding-box', 'content-box']

  if (cssWideKeywords.has(value) || splitCssCommaList(value).every((layer) => boxes.includes(layer))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyBackgroundAttachment(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const attachments = ['scroll', 'fixed', 'local']

  if (cssWideKeywords.has(value) || splitCssCommaList(value).every((layer) => attachments.includes(layer))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyBoxShadow(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || value === 'none' || parseBoxShadow(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function parseBoxShadow(value: string): boolean {
  return splitCssCommaList(value).every(parseSingleBoxShadow)
}

function splitCssCommaList(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0

  for (const char of value) {
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  parts.push(current.trim())
  return parts.filter(Boolean)
}

function parseSingleBoxShadow(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 2) {
    return false
  }

  let lengths = 0
  let color = false
  let inset = false

  for (const part of parts) {
    if (part === 'inset') {
      if (inset) {
        return false
      }

      inset = true
      continue
    }

    if (parsePxLength(part) !== undefined) {
      lengths += 1

      if (lengths > 4) {
        return false
      }

      continue
    }

    if (isVisualColorToken(part)) {
      if (color) {
        return false
      }

      color = true
      continue
    }

    return false
  }

  return lengths >= 2
}

function applyOutline(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseOutline(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyOutlineWidth(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseBorderWidth(value) !== undefined) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyOutlineStyle(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || isKnownLineStyle(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyOutlineOffset(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parsePxLength(value) !== undefined) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyBorderRadius(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseBorderRadius(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyTextDecoration(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseTextDecoration(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function parseTextDecoration(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return false
  }

  let line = false
  let style = false
  let color = false
  let thickness = false

  for (const part of parts) {
    if (isTextDecorationLinePart(part)) {
      if (line) {
        return false
      }

      line = true
      continue
    }

    if (['solid', 'double', 'dotted', 'dashed', 'wavy'].includes(part)) {
      if (style) {
        return false
      }

      style = true
      continue
    }

    if (isVisualColorToken(part)) {
      if (color) {
        return false
      }

      color = true
      continue
    }

    if (part === 'auto' || part === 'from-font' || parseNonNegativeDimension(part) !== undefined) {
      if (thickness) {
        return false
      }

      thickness = true
      continue
    }

    return false
  }

  return true
}

function applyTextDecorationLine(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (cssWideKeywords.has(value) || (parts.length > 0 && parts.every(isTextDecorationLinePart))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isTextDecorationLinePart(value: string): boolean {
  return ['none', 'underline', 'overline', 'line-through', 'blink'].includes(value)
}

function applyTextDecorationThickness(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || value === 'auto' || value === 'from-font' || parseNonNegativeDimension(value) !== undefined) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyVisualFilter(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || value === 'none' || parseVisualFilter(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function parseVisualFilter(value: string): boolean {
  if (value.includes('url(')) {
    return false
  }

  return /^[-a-z]+\(.*\)(\s+[-a-z]+\(.*\))*$/.test(value)
}

function applyTransformOrigin(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (cssWideKeywords.has(value) || (parts.length >= 1 && parts.length <= 3 && parts.every(isTransformOriginPart))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isTransformOriginPart(value: string): boolean {
  return ['left', 'right', 'top', 'bottom', 'center'].includes(value) || parseDimension(value) !== undefined
}

function applyWillChange(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssCommaList(value)

  if (
    cssWideKeywords.has(value) ||
    value === 'auto' ||
    (parts.length > 0 && parts.every((part) => /^[a-z-]+$/.test(part)))
  ) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyAutoOrVisualColor(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto' || isVisualColorToken(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyScrollbarColor(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (cssWideKeywords.has(value) || value === 'auto' || (parts.length === 2 && parts.every(isVisualColorToken))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyOverscrollBehavior(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (cssWideKeywords.has(value) || (parts.length >= 1 && parts.length <= 2 && parts.every((part) => ['auto', 'contain', 'none'].includes(part)))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyListStyle(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)
  const keywords = ['none', 'disc', 'circle', 'square', 'decimal', 'inside', 'outside']

  if (cssWideKeywords.has(value) || (parts.length > 0 && parts.every((part) => keywords.includes(part)))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyColorScheme(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (cssWideKeywords.has(value) || (parts.length > 0 && parts.every((part) => ['normal', 'light', 'dark', 'only'].includes(part)))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

const supportedBlendModes = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
  'plus-darker',
  'plus-lighter',
]

function applyBorderCornerRadius(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (
    cssWideKeywords.has(value) ||
    (parts.length >= 1 && parts.length <= 2 && parts.every((part) => parseNonNegativeDimension(part) !== undefined))
  ) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function parseBorderRadius(value: string): boolean {
  const parts = value.split('/').map((part) => part.trim())

  if (parts.length < 1 || parts.length > 2) {
    return false
  }

  return parts.every((part) => {
    const radii = part.split(/\s+/).filter(Boolean)
    return radii.length >= 1 && radii.length <= 4 && radii.every((radius) => parseNonNegativeDimension(radius) !== undefined)
  })
}

function applyKeywordOnly(
  value: string,
  supported: readonly string[],
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || supported.includes(value)) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyObjectPosition(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (cssWideKeywords.has(value) || (parts.length >= 1 && parts.length <= 4 && parts.every(isObjectPositionPart))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isObjectPositionPart(value: string): boolean {
  return ['left', 'right', 'top', 'bottom', 'center'].includes(value) || parseDimension(value) !== undefined
}

function applyTouchAction(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)
  const supported = ['auto', 'none', 'manipulation', 'pan-x', 'pan-y', 'pan-left', 'pan-right', 'pan-up', 'pan-down', 'pinch-zoom']

  if (cssWideKeywords.has(value) || (parts.length >= 1 && parts.length <= 3 && parts.every((part) => supported.includes(part)))) {
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

const supportedCursorKeywords = [
  'auto',
  'default',
  'none',
  'context-menu',
  'help',
  'pointer',
  'progress',
  'wait',
  'cell',
  'crosshair',
  'text',
  'vertical-text',
  'alias',
  'copy',
  'move',
  'no-drop',
  'not-allowed',
  'grab',
  'grabbing',
  'all-scroll',
  'col-resize',
  'row-resize',
  'n-resize',
  'e-resize',
  's-resize',
  'w-resize',
  'ne-resize',
  'nw-resize',
  'se-resize',
  'sw-resize',
  'ew-resize',
  'ns-resize',
  'nesw-resize',
  'nwse-resize',
  'zoom-in',
  'zoom-out',
]

function parseOutline(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return false
  }

  let width = false
  let style = false
  let color = false

  for (const part of parts) {
    if (parseBorderWidth(part) !== undefined) {
      if (width) {
        return false
      }

      width = true
      continue
    }

    if (isKnownLineStyle(part)) {
      if (style) {
        return false
      }

      style = true
      continue
    }

    if (isVisualColorToken(part)) {
      if (color) {
        return false
      }

      color = true
      continue
    }

    return false
  }

  return true
}

function isKnownLineStyle(value: string): boolean {
  return [
    'auto',
    'none',
    'hidden',
    'dotted',
    'dashed',
    'solid',
    'double',
    'groove',
    'ridge',
    'inset',
    'outset',
  ].includes(value)
}

function isVisualColorToken(value: string): boolean {
  return (
    basicNamedColors.has(value) ||
    cssWideKeywords.has(value) ||
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^(?:rgb|rgba|hsl|hsla)\(.+\)$/.test(value)
  )
}

function applyEdges(
  edges: Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const lengths = parseEdgeLengths(value, property, originalValue, context)

  if (!lengths) {
    return
  }

  edges.top = lengths.top
  edges.right = lengths.right
  edges.bottom = lengths.bottom
  edges.left = lengths.left
}

function applyEdge(
  edges: Edges,
  edge: keyof Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parsePxLength(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  edges[edge] = length
}

function applyBorderWidths(
  edges: Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const lengths = parseEdgeLengths(value, property, originalValue, context, parseBorderWidth)

  if (!lengths) {
    return
  }

  edges.top = lengths.top
  edges.right = lengths.right
  edges.bottom = lengths.bottom
  edges.left = lengths.left
}

function applyLogicalEdges(
  edges: Edges,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
  parseLength: (value: string) => number | undefined,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const start = parseLength(parts[0] ?? '')
  const end = parseLength(parts[1] ?? parts[0] ?? '')

  if (start === undefined || end === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  if (axis === 'inline') {
    edges.left = start
    edges.right = end
    return
  }

  edges.top = start
  edges.bottom = end
}

function applyBorderWidthEdge(
  edges: Edges,
  edge: keyof Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parseBorderWidth(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  edges[edge] = length
}

function applyKeyword<Key extends keyof SupportedStyle>(
  style: SupportedStyle,
  key: Key,
  value: string,
  supported: readonly SupportedStyle[Key][],
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (supported.includes(value as SupportedStyle[Key])) {
    style[key] = value as SupportedStyle[Key]
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyPlaceContent(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const align = parts[0] ?? ''
  const justify = parts[1] ?? align

  if (isAlignContentValue(align) && isJustifyContentValue(justify)) {
    style.alignContent = align
    style.justifyContent = justify
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyPlaceItems(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const align = parts[0] ?? ''
  const justify = parts[1] ?? align

  if (isAlignItemsValue(align) && isAlignItemsValue(justify)) {
    style.alignItems = align
    style.justifyItems = justify
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyPlaceSelf(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const align = parts[0] ?? ''
  const justify = parts[1] ?? align

  if (isAlignSelfValue(align) && isAlignSelfValue(justify)) {
    style.alignSelf = align
    style.justifySelf = justify
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function isAlignItemsValue(value: string): value is AlignItemsValue {
  return ['start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'].includes(value)
}

function isAlignSelfValue(value: string): value is AlignSelfValue {
  return value === 'auto' || isAlignItemsValue(value)
}

function isJustifyContentValue(value: string): value is JustifyContentValue {
  return ['start', 'end', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'].includes(value)
}

function isAlignContentValue(value: string): value is AlignContentValue {
  return value === 'stretch' || isJustifyContentValue(value)
}

function applyLength(
  style: SupportedStyle,
  key:
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'width'
    | 'height'
    | 'minWidth'
    | 'minHeight'
    | 'maxWidth'
    | 'maxHeight',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (isInsetLengthKey(key)) {
    if (value === 'auto') {
      style[key] = undefined
      return
    }

    const length = parsePxLength(value)

    if (length === undefined) {
      handleUnsupportedCss(context.policy, {
        property,
        value: originalValue,
        reason: 'unsupported-value',
        source: context.source,
        selector: context.selector,
        element: context.element,
      })
      return
    }

    style[key] = length
    return
  }

  if (value === 'auto' && (key === 'width' || key === 'height' || key === 'minWidth' || key === 'minHeight')) {
    style[key] = undefined
    return
  }

  if (value === 'none' && (key === 'maxWidth' || key === 'maxHeight')) {
    style[key] = undefined
    return
  }

  const length = parseDimension(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = length
}

function isInsetLengthKey(
  key: Parameters<typeof applyLength>[1],
): key is 'left' | 'right' | 'top' | 'bottom' {
  return key === 'left' || key === 'right' || key === 'top' || key === 'bottom'
}

function applyNumber(
  style: SupportedStyle,
  key: 'flexGrow' | 'flexShrink',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const number = Number(value)

  if (!Number.isFinite(number) || number < 0) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = number
}

function applyFlexBasis(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.flexBasis = undefined
    return
  }

  const length = parseNonNegativeDimension(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style.flexBasis = length
}

function applyFlexShorthand(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.flexGrow = 1
    style.flexShrink = 1
    style.flexBasis = undefined
    return
  }

  if (value === 'none') {
    style.flexGrow = 0
    style.flexShrink = 0
    style.flexBasis = undefined
    return
  }

  if (value === 'initial') {
    style.flexGrow = 0
    style.flexShrink = 1
    style.flexBasis = undefined
    return
  }

  const parts = value.split(/\s+/).filter(Boolean)
  const parsed = parseFlexShorthand(parts)

  if (!parsed) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style.flexGrow = parsed.grow
  style.flexShrink = parsed.shrink
  style.flexBasis = parsed.basis
}

function applyAspectRatio(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.aspectRatio = undefined
    return
  }

  const ratio = parseAspectRatio(value)

  if (ratio === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style.aspectRatio = ratio
}

function applyGridTemplate(
  style: SupportedStyle,
  key: 'gridTemplateColumns' | 'gridTemplateRows',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none') {
    style[key] = []
    return
  }

  const tracks = value.split(/\s+/).filter(Boolean).map(parseGridTrack)

  if (tracks.length === 0 || tracks.some((track) => track === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = tracks as GridTrack[]
}

function applyGridAutoTracks(
  style: SupportedStyle,
  key: 'gridAutoColumns' | 'gridAutoRows',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const tracks = value.split(/\s+/).filter(Boolean).map(parseGridTrack)

  if (tracks.length === 0 || tracks.some((track) => track === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = tracks as GridTrack[]
}

function applyGridLine(
  style: SupportedStyle,
  startKey: 'gridColumnStart' | 'gridRowStart',
  endKey: 'gridColumnEnd' | 'gridRowEnd',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split('/').map((part) => part.trim()).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const start = parseGridPlacement(parts[0] ?? '')
  const end = parts.length === 2 ? parseGridPlacement(parts[1] ?? '') : 'auto'

  if (start === undefined || end === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[startKey] = start
  style[endKey] = end
}

function applyGridPlacement(
  style: SupportedStyle,
  key: 'gridColumnStart' | 'gridColumnEnd' | 'gridRowStart' | 'gridRowEnd',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const placement = parseGridPlacement(value)

  if (placement === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = placement
}

function parseGridPlacement(value: string): GridPlacementValue | undefined {
  if (value === 'auto') {
    return 'auto'
  }

  const number = Number(value)
  return Number.isInteger(number) && number !== 0 ? number : undefined
}

function parseGridTrack(value: string): GridTrack | undefined {
  const length = parseNonNegativeDimension(value)

  if (length !== undefined) {
    return length
  }

  return undefined
}

function parseAspectRatio(value: string): number | undefined {
  const parts = value.split('/').map((part) => part.trim()).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    return undefined
  }

  const numerator = parsePositiveNumber(parts[0] ?? '')
  const denominator = parts.length === 2 ? parsePositiveNumber(parts[1] ?? '') : 1

  if (numerator === undefined || denominator === undefined) {
    return undefined
  }

  return numerator / denominator
}

function parseFlexShorthand(
  parts: string[],
): { grow: number; shrink: number; basis: SupportedDimension | undefined } | undefined {
  if (parts.length < 1 || parts.length > 3) {
    return undefined
  }

  if (parts.length === 1) {
    const number = parseNonNegativeNumber(parts[0] ?? '')

    if (number !== undefined) {
      return { grow: number, shrink: 1, basis: 0 }
    }

    const basis = parseFlexBasisValue(parts[0] ?? '')
    return basis !== null ? { grow: 1, shrink: 1, basis } : undefined
  }

  const grow = parseNonNegativeNumber(parts[0] ?? '')

  if (grow === undefined) {
    return undefined
  }

  if (parts.length === 2) {
    const shrink = parseNonNegativeNumber(parts[1] ?? '')

    if (shrink !== undefined) {
      return { grow, shrink, basis: 0 }
    }

    const basis = parseFlexBasisValue(parts[1] ?? '')
    return basis !== null ? { grow, shrink: 1, basis } : undefined
  }

  const shrink = parseNonNegativeNumber(parts[1] ?? '')
  const basis = parseFlexBasisValue(parts[2] ?? '')

  if (shrink === undefined || basis === null) {
    return undefined
  }

  return { grow, shrink, basis }
}

function parseFlexBasisValue(value: string): SupportedDimension | undefined | null {
  if (value === 'auto') {
    return undefined
  }

  const length = parseNonNegativeDimension(value)
  return length === undefined ? null : length
}

function applyInset(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const lengths = parts.map(parseInsetLength)

  if (lengths.some((length) => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [top, right = top, bottom = top, left = right] = lengths as Array<number | 'auto'>

  setInsetSide(style, 'top', top)
  setInsetSide(style, 'right', right)
  setInsetSide(style, 'bottom', bottom)
  setInsetSide(style, 'left', left)
}

function applyLogicalInset(
  style: SupportedStyle,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const start = parseInsetLength(parts[0] ?? '')
  const end = parseInsetLength(parts[1] ?? parts[0] ?? '')

  if (start === undefined || end === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  if (axis === 'inline') {
    setInsetSide(style, 'left', start)
    setInsetSide(style, 'right', end)
    return
  }

  setInsetSide(style, 'top', start)
  setInsetSide(style, 'bottom', end)
}

function applyGap(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const lengths = parts.map(parseGapLength)

  if (lengths.some((length) => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [rowGap, columnGap = rowGap] = lengths as number[]
  style.rowGap = rowGap
  style.columnGap = columnGap
}

function applyGapLength(
  style: SupportedStyle,
  key: 'rowGap' | 'columnGap',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parseGapLength(value)

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style[key] = length
}

function parseInsetLength(value: string): number | 'auto' | undefined {
  return value === 'auto' ? 'auto' : parsePxLength(value)
}

function setInsetSide(
  style: SupportedStyle,
  key: 'top' | 'right' | 'bottom' | 'left',
  value: number | 'auto',
): void {
  style[key] = value === 'auto' ? undefined : value
}

function parseGapLength(value: string): number | undefined {
  return value === 'normal' ? 0 : parseNonNegativePxLength(value)
}

function applyBorderStyles(
  styles: BorderStyles,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const [top, right = top, bottom = top, left = right] = parts
  applyBorderStyle(styles, 'top', top, property, originalValue, context)
  applyBorderStyle(styles, 'right', right, property, originalValue, context)
  applyBorderStyle(styles, 'bottom', bottom, property, originalValue, context)
  applyBorderStyle(styles, 'left', left, property, originalValue, context)
}

function applyLogicalBorderStyles(
  styles: BorderStyles,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const start = parts[0] ?? ''
  const end = parts[1] ?? start

  if (axis === 'inline') {
    applyBorderStyle(styles, 'left', start, property, originalValue, context)
    applyBorderStyle(styles, 'right', end, property, originalValue, context)
    return
  }

  applyBorderStyle(styles, 'top', start, property, originalValue, context)
  applyBorderStyle(styles, 'bottom', end, property, originalValue, context)
}

function applyBorderStyle(
  styles: BorderStyles,
  edge: keyof BorderStyles,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || value === 'solid') {
    styles[edge] = value
    return
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  })
}

function applyBorderShorthand(
  style: SupportedStyle,
  edge: keyof Edges | undefined,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parsed = parseBorderShorthand(value)

  if (!parsed) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  const edges: Array<keyof Edges> = edge ? [edge] : ['top', 'right', 'bottom', 'left']

  for (const currentEdge of edges) {
    style.borderWidth[currentEdge] = parsed.width
    style.borderStyle[currentEdge] = parsed.style
  }
}

function parseBorderShorthand(value: string): { width: number; style: BorderStyleValue } | undefined {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return undefined
  }

  let width: number | undefined
  let style: BorderStyleValue | undefined

  for (const part of parts) {
    const parsedWidth = parseBorderWidth(part)

    if (parsedWidth !== undefined) {
      if (width !== undefined) {
        return undefined
      }

      width = parsedWidth
      continue
    }

    if (part === 'none' || part === 'solid') {
      if (style !== undefined) {
        return undefined
      }

      style = part
      continue
    }

    if (isUnsupportedKnownBorderStyle(part)) {
      return undefined
    }

    // Border color has no effect on layout or hit testing, so recognized color-like
    // tokens are accepted and intentionally discarded.
    if (!isBorderColorLikeToken(part)) {
      return undefined
    }
  }

  return {
    width: width ?? 3,
    style: style ?? 'none',
  }
}

function parseBorderWidth(value: string): number | undefined {
  switch (value) {
    case 'thin':
      return 1
    case 'medium':
      return 3
    case 'thick':
      return 5
    default:
      return parsePxLength(value)
  }
}

function isUnsupportedKnownBorderStyle(value: string): boolean {
  return [
    'hidden',
    'dotted',
    'dashed',
    'double',
    'groove',
    'ridge',
    'inset',
    'outset',
  ].includes(value)
}

function isBorderColorLikeToken(value: string): boolean {
  return isVisualColorToken(value) && !cssWideKeywords.has(value)
}

const cssWideKeywords = new Set([
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'unset',
])

const basicNamedColors = new Set([
  'black',
  'blue',
  'currentcolor',
  'gray',
  'green',
  'grey',
  'orange',
  'purple',
  'red',
  'transparent',
  'white',
  'yellow',
])

function applyZIndex(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.zIndex = 0
    return
  }

  const zIndex = Number(value)

  if (!Number.isInteger(zIndex)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return
  }

  style.zIndex = zIndex
}

function parsePxLength(value: string): number | undefined {
  if (value === '0') {
    return 0
  }

  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value)
  return match ? Number(match[1]) : undefined
}

function parseDimension(value: string): SupportedDimension | undefined {
  const length = parsePxLength(value)

  if (length !== undefined) {
    return length
  }

  const percentage = parsePercentage(value)
  return percentage === undefined ? undefined : `${percentage}%`
}

function parsePercentage(value: string): number | undefined {
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(value)
  return match ? Number(match[1]) : undefined
}

function parseNonNegativePxLength(value: string): number | undefined {
  const length = parsePxLength(value)
  return length !== undefined && length >= 0 ? length : undefined
}

function parseNonNegativeDimension(value: string): SupportedDimension | undefined {
  const length = parseDimension(value)

  if (typeof length === 'number') {
    return length >= 0 ? length : undefined
  }

  if (typeof length === 'string') {
    const percentage = parsePercentage(length)
    return percentage !== undefined && percentage >= 0 ? length : undefined
  }

  return undefined
}

function parseNonNegativeNumber(value: string): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function parsePositiveNumber(value: string): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function parseEdgeLengths(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
  parseLength: (value: string) => number | undefined = parsePxLength,
): Edges | undefined {
  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return undefined
  }

  const lengths = parts.map(parseLength)

  if (lengths.some((length) => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    })
    return undefined
  }

  const [top, right = top, bottom = top, left = right] = lengths as number[]
  return { top, right, bottom, left }
}

function edgeNameFromProperty(property: string): keyof Edges {
  if (property.includes('-right-') || property.endsWith('-right')) {
    return 'right'
  }

  if (property.includes('-bottom-') || property.endsWith('-bottom')) {
    return 'bottom'
  }

  if (property.includes('-left-') || property.endsWith('-left')) {
    return 'left'
  }

  return 'top'
}

function zeroEdges(): Edges {
  return { top: 0, right: 0, bottom: 0, left: 0 }
}
