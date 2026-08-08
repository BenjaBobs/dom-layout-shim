import type { WhiteSpace } from '../../api/text-measurer.ts'

export type Edges<Value = number> = {
  top: Value
  right: Value
  bottom: Value
  left: Value
}

export type BorderStyleValue =
  | 'none'
  | 'hidden'
  | 'dotted'
  | 'dashed'
  | 'solid'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset'

export type BorderStyles = {
  top: BorderStyleValue
  right: BorderStyleValue
  bottom: BorderStyleValue
  left: BorderStyleValue
}

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
export type OverflowValue = 'visible' | 'hidden' | 'clip' | 'auto' | 'scroll'
export type SupportedDimension = number | `${number}%`
export type MarginValue = SupportedDimension | 'auto'
export type GridMinTrackBreadth = number | `${number}%` | 'auto' | 'min-content' | 'max-content'
export type GridMaxTrackBreadth = GridMinTrackBreadth | `${number}fr`
export type GridTrack = GridMinTrackBreadth | `${number}fr` | { min: GridMinTrackBreadth; max: GridMaxTrackBreadth }
export type GridTemplateTrack = GridTrack | { repeat: number; tracks: GridTrack[] }
export type GridPlacementValue = 'auto' | number | { span: number }
export type GridAutoFlowValue = 'row' | 'column' | 'row dense' | 'column dense'
export type CaptionSideValue = 'top' | 'bottom'
export type EmptyCellsValue = 'show' | 'hide'
export type BorderCollapseValue = 'separate' | 'collapse'
export type TableBorderSpacing = {
  horizontal: number
  vertical: number
}

export type SupportedTransform =
  | { type: 'translate'; x: SupportedDimension; y: SupportedDimension }
  | { type: 'scale'; x: number; y: number }

export type TransformOrigin = {
  x: SupportedDimension
  y: SupportedDimension
}

export type SupportedStyle = {
  display:
    | 'block'
    | 'inline'
    | 'flex'
    | 'grid'
    | 'table'
    | 'table-row-group'
    | 'table-header-group'
    | 'table-footer-group'
    | 'table-row'
    | 'table-cell'
    | 'table-caption'
    | 'table-column-group'
    | 'table-column'
    | 'contents'
    | 'none'
  position: 'static' | 'relative' | 'absolute' | 'fixed'
  boxSizing: 'content-box' | 'border-box'
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse'
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
  order: number
  aspectRatio?: number
  gridAutoFlow: GridAutoFlowValue
  gridTemplateColumns: GridTemplateTrack[]
  gridTemplateRows: GridTemplateTrack[]
  gridAutoColumns: GridTrack[]
  gridAutoRows: GridTrack[]
  gridColumnStart: GridPlacementValue
  gridColumnEnd: GridPlacementValue
  gridRowStart: GridPlacementValue
  gridRowEnd: GridPlacementValue
  captionSide: CaptionSideValue
  borderCollapse: BorderCollapseValue
  emptyCells?: EmptyCellsValue
  tableBorderSpacing: TableBorderSpacing
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
  visibility: 'visible' | 'hidden' | 'collapse'
  overflowX: OverflowValue
  overflowY: OverflowValue
  margin: Edges<MarginValue>
  padding: Edges<SupportedDimension>
  rowGap: SupportedDimension
  columnGap: SupportedDimension
  borderWidth: Edges
  borderStyle: BorderStyles
  fontFamily: string
  fontSize: number
  lineHeight: number
  whiteSpace: WhiteSpace
  transform: SupportedTransform[]
  translate?: Extract<SupportedTransform, { type: 'translate' }>
  scale?: Extract<SupportedTransform, { type: 'scale' }>
  transformOrigin: TransformOrigin
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
    order: 0,
    gridAutoFlow: 'row',
    gridTemplateColumns: [],
    gridTemplateRows: [],
    gridAutoColumns: [],
    gridAutoRows: [],
    gridColumnStart: 'auto',
    gridColumnEnd: 'auto',
    gridRowStart: 'auto',
    gridRowEnd: 'auto',
    captionSide: 'top',
    borderCollapse: 'separate',
    tableBorderSpacing: {
      horizontal: 2,
      vertical: 2,
    },
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
    transform: [],
    transformOrigin: { x: '50%', y: '50%' },
  }
}

export function zeroEdges(): Edges {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }
}
