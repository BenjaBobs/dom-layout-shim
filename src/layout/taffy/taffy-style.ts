import {
  AlignContent,
  AlignItems,
  AlignSelf,
  BoxSizing,
  Display,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  Position,
  Style,
  type Size,
  type TrackSizingFunction,
} from 'taffy-layout'
import type { Edges, SupportedStyle } from '../../css/supported-style.ts'

export type TaffyStyleContext = {
  replacedSize?: Size<number>
}

export function toTaffyStyle(style: SupportedStyle, context: TaffyStyleContext | undefined): Style {
  const taffyStyle = new Style()
  taffyStyle.display = toTaffyDisplay(style.display)
  taffyStyle.position =
    style.position === 'absolute' || style.position === 'fixed' ? Position.Absolute : Position.Relative
  taffyStyle.boxSizing = style.boxSizing === 'border-box' ? BoxSizing.BorderBox : BoxSizing.ContentBox
  taffyStyle.flexDirection = toTaffyFlexDirection(style.flexDirection)
  taffyStyle.flexWrap = toTaffyFlexWrap(style.flexWrap)
  taffyStyle.alignItems = toTaffyAlignItems(style.alignItems)
  taffyStyle.alignSelf = toTaffyAlignSelf(style.alignSelf)
  taffyStyle.alignContent = toTaffyAlignContent(style.alignContent)
  taffyStyle.justifyContent = toTaffyJustifyContent(style.justifyContent)
  taffyStyle.justifyItems = toTaffyAlignItems(style.justifyItems)
  taffyStyle.justifySelf = toTaffyAlignSelf(style.justifySelf ?? 'auto')
  taffyStyle.flexGrow = style.flexGrow
  taffyStyle.flexShrink = style.flexShrink
  taffyStyle.flexBasis = style.flexBasis ?? 'auto'
  taffyStyle.aspectRatio = style.aspectRatio
  taffyStyle.gridTemplateColumns = toTaffyGridTracks(style.gridTemplateColumns)
  taffyStyle.gridTemplateRows = toTaffyGridTracks(style.gridTemplateRows)
  taffyStyle.gridAutoColumns = toTaffyGridTracks(style.gridAutoColumns)
  taffyStyle.gridAutoRows = toTaffyGridTracks(style.gridAutoRows)
  taffyStyle.gridColumn = {
    start: style.gridColumnStart,
    end: style.gridColumnEnd,
  }
  taffyStyle.gridRow = {
    start: style.gridRowStart,
    end: style.gridRowEnd,
  }
  taffyStyle.size = {
    width: style.width ?? context?.replacedSize?.width ?? 'auto',
    height: style.height ?? context?.replacedSize?.height ?? 'auto',
  }
  taffyStyle.minSize = {
    width: style.minWidth ?? 'auto',
    height: style.minHeight ?? 'auto',
  }
  taffyStyle.maxSize = {
    width: style.maxWidth ?? 'auto',
    height: style.maxHeight ?? 'auto',
  }
  taffyStyle.margin = toTaffyRect(style.margin)
  taffyStyle.padding = toTaffyRect(style.padding)
  taffyStyle.border = toTaffyRect(effectiveBorderWidth(style))
  taffyStyle.gap = {
    width: style.columnGap,
    height: style.rowGap,
  }
  taffyStyle.inset = {
    left: style.left ?? 'auto',
    right: style.right ?? 'auto',
    top: style.top ?? 'auto',
    bottom: style.bottom ?? 'auto',
  }

  return taffyStyle
}

export function effectiveBorderWidth(style: SupportedStyle): Edges {
  return {
    top: style.borderStyle.top === 'none' ? 0 : style.borderWidth.top,
    right: style.borderStyle.right === 'none' ? 0 : style.borderWidth.right,
    bottom: style.borderStyle.bottom === 'none' ? 0 : style.borderWidth.bottom,
    left: style.borderStyle.left === 'none' ? 0 : style.borderWidth.left,
  }
}

function toTaffyDisplay(value: SupportedStyle['display']): Display {
  switch (value) {
    case 'flex':
      return Display.Flex
    case 'grid':
      return Display.Grid
    case 'none':
      return Display.None
    default:
      return Display.Block
  }
}

function toTaffyFlexDirection(value: SupportedStyle['flexDirection']): FlexDirection {
  switch (value) {
    case 'row-reverse':
      return FlexDirection.RowReverse
    case 'column':
      return FlexDirection.Column
    case 'column-reverse':
      return FlexDirection.ColumnReverse
    default:
      return FlexDirection.Row
  }
}

function toTaffyGridTracks(tracks: SupportedStyle['gridTemplateColumns']): TrackSizingFunction[] {
  return tracks.map((track) => {
    const taffyTrack = toTaffyGridTrack(track)
    return { min: taffyTrack, max: taffyTrack }
  })
}

function toTaffyGridTrack(track: SupportedStyle['gridTemplateColumns'][number]): number | `${number}%` {
  if (typeof track !== 'string') {
    return track
  }

  const percentage = Number(track.slice(0, -1))
  return `${percentage / 100}%`
}

function toTaffyFlexWrap(value: SupportedStyle['flexWrap']): FlexWrap {
  switch (value) {
    case 'wrap':
      return FlexWrap.Wrap
    case 'wrap-reverse':
      return FlexWrap.WrapReverse
    default:
      return FlexWrap.NoWrap
  }
}

function toTaffyAlignItems(value: SupportedStyle['alignItems']): AlignItems | undefined {
  switch (value) {
    case 'start':
      return AlignItems.Start
    case 'end':
      return AlignItems.End
    case 'flex-start':
      return AlignItems.FlexStart
    case 'flex-end':
      return AlignItems.FlexEnd
    case 'center':
      return AlignItems.Center
    case 'stretch':
      return AlignItems.Stretch
    default:
      return undefined
  }
}

function toTaffyAlignSelf(value: SupportedStyle['alignSelf']): AlignSelf {
  switch (value) {
    case 'start':
      return AlignSelf.Start
    case 'end':
      return AlignSelf.End
    case 'flex-start':
      return AlignSelf.FlexStart
    case 'flex-end':
      return AlignSelf.FlexEnd
    case 'center':
      return AlignSelf.Center
    case 'stretch':
      return AlignSelf.Stretch
    default:
      return AlignSelf.Auto
  }
}

function toTaffyAlignContent(value: SupportedStyle['alignContent']): AlignContent | undefined {
  switch (value) {
    case 'start':
      return AlignContent.Start
    case 'end':
      return AlignContent.End
    case 'flex-start':
      return AlignContent.FlexStart
    case 'flex-end':
      return AlignContent.FlexEnd
    case 'center':
      return AlignContent.Center
    case 'stretch':
      return AlignContent.Stretch
    case 'space-between':
      return AlignContent.SpaceBetween
    case 'space-around':
      return AlignContent.SpaceAround
    case 'space-evenly':
      return AlignContent.SpaceEvenly
    default:
      return undefined
  }
}

function toTaffyJustifyContent(value: SupportedStyle['justifyContent']): JustifyContent | undefined {
  switch (value) {
    case 'start':
      return JustifyContent.Start
    case 'end':
      return JustifyContent.End
    case 'flex-start':
      return JustifyContent.FlexStart
    case 'flex-end':
      return JustifyContent.FlexEnd
    case 'center':
      return JustifyContent.Center
    case 'space-between':
      return JustifyContent.SpaceBetween
    case 'space-around':
      return JustifyContent.SpaceAround
    case 'space-evenly':
      return JustifyContent.SpaceEvenly
    default:
      return undefined
  }
}

function toTaffyRect(edges: Edges): { left: number; right: number; top: number; bottom: number } {
  return {
    left: edges.left,
    right: edges.right,
    top: edges.top,
    bottom: edges.bottom,
  }
}
