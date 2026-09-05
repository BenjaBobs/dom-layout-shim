import { resolveCalculatedDimension } from '../../css/length-value.ts';
import type {
  Edges,
  GridMaxTrackBreadth,
  GridMinTrackBreadth,
  GridTemplateTrack,
  GridTrack,
  MarginValue,
  SupportedDimension,
  SupportedStyle,
} from '../../css/supported-style.ts';
import type { ReplacedIntrinsicSize } from './replaced-intrinsic-size.ts';
import {
  AlignContent,
  AlignItems,
  AlignSelf,
  BoxSizing,
  Display,
  FlexDirection,
  FlexWrap,
  GridAutoFlow,
  type GridTemplateComponent,
  JustifyContent,
  type MaxTrackSizingFunction,
  type MinTrackSizingFunction,
  Position,
  type Size,
  Style,
  type TrackSizingFunction,
} from './taffy-bindings.ts';

export type TaffyStyleContext = {
  intrinsicReplaced?: ReplacedIntrinsicSize;
  isFlexItem?: boolean;
  replacedSize?: Size<number>;
  percentageBasis?: { width?: number; height?: number };
};

export function toTaffyStyle(
  style: SupportedStyle,
  context: TaffyStyleContext | undefined,
): Style {
  const taffyStyle = new Style();
  taffyStyle.display = toTaffyDisplay(style.display);
  taffyStyle.position =
    style.position === 'absolute' || style.position === 'fixed'
      ? Position.Absolute
      : Position.Relative;
  taffyStyle.boxSizing =
    style.boxSizing === 'border-box'
      ? BoxSizing.BorderBox
      : BoxSizing.ContentBox;
  taffyStyle.flexDirection = toTaffyFlexDirection(style.flexDirection);
  taffyStyle.flexWrap = toTaffyFlexWrap(style.flexWrap);
  taffyStyle.alignItems = toTaffyAlignItems(style.alignItems);
  taffyStyle.alignSelf = toTaffyAlignSelf(style.alignSelf);
  taffyStyle.alignContent = toTaffyAlignContent(style.alignContent);
  taffyStyle.justifyContent = toTaffyJustifyContent(style.justifyContent);
  taffyStyle.justifyItems = toTaffyAlignItems(style.justifyItems);
  taffyStyle.justifySelf = toTaffyAlignSelf(style.justifySelf ?? 'auto');
  taffyStyle.flexGrow = style.flexGrow;
  taffyStyle.flexShrink = style.flexShrink;
  taffyStyle.flexBasis =
    resolvedDimension(style.flexBasis, context?.percentageBasis?.width) ??
    'auto';
  taffyStyle.aspectRatio = replacedAspectRatio(style, context);
  taffyStyle.gridAutoFlow = toTaffyGridAutoFlow(style.gridAutoFlow);
  taffyStyle.gridTemplateColumns = toTaffyGridTracks(style.gridTemplateColumns);
  taffyStyle.gridTemplateRows = toTaffyGridTracks(style.gridTemplateRows);
  taffyStyle.gridAutoColumns = toTaffyAutoGridTracks(style.gridAutoColumns);
  taffyStyle.gridAutoRows = toTaffyAutoGridTracks(style.gridAutoRows);
  taffyStyle.gridTemplateAreas = style.gridTemplateAreas
    ? {
        areas: [...style.gridTemplateAreas].map(([name, area]) => ({
          name,
          ...area,
        })),
        rowCount: style.gridTemplateAreaRowCount ?? 0,
        columnCount: style.gridTemplateAreaColumnCount ?? 0,
      }
    : undefined;
  taffyStyle.gridColumn = {
    start: toTaffyGridPlacement(style.gridColumnStart),
    end: toTaffyGridPlacement(style.gridColumnEnd),
  };
  taffyStyle.gridRow = {
    start: toTaffyGridPlacement(style.gridRowStart),
    end: toTaffyGridPlacement(style.gridRowEnd),
  };
  taffyStyle.size = {
    width:
      resolvedDimension(style.width, context?.percentageBasis?.width) ??
      intrinsicFallbackWidth(style, context) ??
      'auto',
    height:
      resolvedDimension(style.height, context?.percentageBasis?.height) ??
      (context?.intrinsicReplaced && taffyStyle.aspectRatio
        ? undefined
        : context?.replacedSize?.height) ??
      'auto',
  };
  taffyStyle.minSize = {
    width:
      resolvedDimension(style.minWidth, context?.percentageBasis?.width) ??
      'auto',
    height:
      resolvedDimension(style.minHeight, context?.percentageBasis?.height) ??
      'auto',
  };
  taffyStyle.maxSize = {
    width:
      resolvedDimension(style.maxWidth, context?.percentageBasis?.width) ??
      'auto',
    height:
      resolvedDimension(style.maxHeight, context?.percentageBasis?.height) ??
      'auto',
  };
  taffyStyle.margin = resolveMarginRect(
    style.margin,
    context?.percentageBasis?.width,
  );
  taffyStyle.padding = resolveDimensionRect(
    style.padding,
    context?.percentageBasis?.width,
  );
  taffyStyle.border = toTaffyRect(effectiveBorderWidth(style));
  taffyStyle.gap = {
    width:
      resolvedDimension(style.columnGap, context?.percentageBasis?.width) ?? 0,
    height:
      resolvedDimension(style.rowGap, context?.percentageBasis?.height) ?? 0,
  };
  taffyStyle.inset = {
    // Taffy has no sticky positioning. Keep sticky nodes in their normal-flow
    // location here; collection applies their scrollport constraints later.
    left:
      style.position === 'static' || style.position === 'sticky'
        ? 'auto'
        : (resolvedDimension(style.left, context?.percentageBasis?.width) ??
          'auto'),
    right:
      style.position === 'static' || style.position === 'sticky'
        ? 'auto'
        : (resolvedDimension(style.right, context?.percentageBasis?.width) ??
          'auto'),
    top:
      style.position === 'static' || style.position === 'sticky'
        ? 'auto'
        : (resolvedDimension(style.top, context?.percentageBasis?.height) ??
          'auto'),
    bottom:
      style.position === 'static' || style.position === 'sticky'
        ? 'auto'
        : (resolvedDimension(style.bottom, context?.percentageBasis?.height) ??
          'auto'),
  };

  normalizeIntrinsicBoxSizing(taffyStyle, style, context);
  return taffyStyle;
}

function resolvedDimension(
  value: SupportedDimension | undefined,
  basis: number | undefined,
): number | `${number}%` | undefined {
  return value === undefined
    ? undefined
    : resolveCalculatedDimension(value, basis);
}

function resolveDimensionRect(
  value: Edges<SupportedDimension>,
  basis: number | undefined,
): Edges<number | `${number}%`> {
  return {
    top: resolvedDimension(value.top, basis) ?? 0,
    right: resolvedDimension(value.right, basis) ?? 0,
    bottom: resolvedDimension(value.bottom, basis) ?? 0,
    left: resolvedDimension(value.left, basis) ?? 0,
  };
}

function resolveMarginRect(
  value: Edges<MarginValue>,
  basis: number | undefined,
): Edges<number | `${number}%` | 'auto'> {
  const resolve = (side: MarginValue): number | `${number}%` | 'auto' =>
    side === 'auto' ? side : (resolvedDimension(side, basis) ?? 0);
  return {
    top: resolve(value.top),
    right: resolve(value.right),
    bottom: resolve(value.bottom),
    left: resolve(value.left),
  };
}

function toTaffyGridPlacement(
  value: SupportedStyle['gridColumnStart'],
): 'auto' | number | { span: number } | { area: string } {
  return value;
}

export function effectiveBorderWidth(style: SupportedStyle): Edges {
  return {
    top: borderStyleHasGeometry(style.borderStyle.top)
      ? style.borderWidth.top
      : 0,
    right: borderStyleHasGeometry(style.borderStyle.right)
      ? style.borderWidth.right
      : 0,
    bottom: borderStyleHasGeometry(style.borderStyle.bottom)
      ? style.borderWidth.bottom
      : 0,
    left: borderStyleHasGeometry(style.borderStyle.left)
      ? style.borderWidth.left
      : 0,
  };
}

function borderStyleHasGeometry(
  style: SupportedStyle['borderStyle'][keyof SupportedStyle['borderStyle']],
): boolean {
  return style !== 'none' && style !== 'hidden';
}

function toTaffyDisplay(value: SupportedStyle['display']): Display {
  switch (value) {
    case 'flow-root':
      return Display.FlowRoot;
    case 'flex':
      return Display.Flex;
    case 'grid':
      return Display.Grid;
    case 'contents':
      return Display.Block;
    case 'none':
      return Display.None;
    default:
      return Display.Block;
  }
}

function toTaffyFlexDirection(
  value: SupportedStyle['flexDirection'],
): FlexDirection {
  switch (value) {
    case 'row-reverse':
      return FlexDirection.RowReverse;
    case 'column':
      return FlexDirection.Column;
    case 'column-reverse':
      return FlexDirection.ColumnReverse;
    default:
      return FlexDirection.Row;
  }
}

function toTaffyGridTracks(
  tracks: SupportedStyle['gridTemplateColumns'],
): GridTemplateComponent[] {
  return tracks.map(track => {
    if (isGridRepeat(track)) {
      return {
        count: track.repeat,
        tracks: track.tracks.map(toTaffyGridTrackSizing),
      };
    }

    return toTaffyGridTrackSizing(track);
  });
}

function toTaffyAutoGridTracks(
  tracks: SupportedStyle['gridAutoColumns'],
): TrackSizingFunction[] {
  return tracks.map(toTaffyGridTrackSizing);
}

function toTaffyGridTrackSizing(track: GridTrack): TrackSizingFunction {
  if (typeof track === 'object') {
    return {
      min: toTaffyGridMinTrackBreadth(track.min),
      max: toTaffyGridMaxTrackBreadth(track.max),
    };
  }

  if (isFractionTrack(track)) {
    return { min: 0, max: track };
  }

  const taffyTrack = toTaffyGridTrack(track);
  return { min: taffyTrack, max: taffyTrack };
}

function toTaffyGridTrack(
  track: GridMinTrackBreadth,
): number | `${number}%` | 'auto' | 'min-content' | 'max-content' {
  if (typeof track !== 'string') {
    return track;
  }

  if (track === 'auto' || track === 'min-content' || track === 'max-content') {
    return track;
  }

  // The previous third-party binding interpreted percentage track strings as
  // fractional values. The repository binding accepts CSS percentages and
  // performs the fraction conversion at the Rust boundary.
  return track;
}

function toTaffyGridMinTrackBreadth(
  track: GridMinTrackBreadth,
): MinTrackSizingFunction {
  return toTaffyGridTrack(track);
}

function toTaffyGridMaxTrackBreadth(
  track: GridMaxTrackBreadth,
): MaxTrackSizingFunction {
  if (isFractionTrack(track)) {
    return track;
  }

  return toTaffyGridTrack(track);
}

function isFractionTrack(
  track: GridMinTrackBreadth | GridMaxTrackBreadth,
): track is `${number}fr` {
  return typeof track === 'string' && track.endsWith('fr');
}

function isGridRepeat(
  track: GridTemplateTrack,
): track is { repeat: number; tracks: GridTrack[] } {
  return typeof track === 'object' && track !== null && 'repeat' in track;
}

function toTaffyFlexWrap(value: SupportedStyle['flexWrap']): FlexWrap {
  switch (value) {
    case 'wrap':
      return FlexWrap.Wrap;
    case 'wrap-reverse':
      return FlexWrap.WrapReverse;
    default:
      return FlexWrap.NoWrap;
  }
}

function toTaffyGridAutoFlow(
  value: SupportedStyle['gridAutoFlow'],
): GridAutoFlow {
  switch (value) {
    case 'column':
      return GridAutoFlow.Column;
    case 'row dense':
      return GridAutoFlow.RowDense;
    case 'column dense':
      return GridAutoFlow.ColumnDense;
    default:
      return GridAutoFlow.Row;
  }
}

function toTaffyAlignItems(
  value: SupportedStyle['alignItems'],
): AlignItems | undefined {
  switch (value) {
    case 'start':
      return AlignItems.Start;
    case 'end':
      return AlignItems.End;
    case 'flex-start':
      return AlignItems.FlexStart;
    case 'flex-end':
      return AlignItems.FlexEnd;
    case 'center':
      return AlignItems.Center;
    case 'stretch':
      return AlignItems.Stretch;
    default:
      return undefined;
  }
}

function toTaffyAlignSelf(value: SupportedStyle['alignSelf']): AlignSelf {
  switch (value) {
    case 'start':
      return AlignSelf.Start;
    case 'end':
      return AlignSelf.End;
    case 'flex-start':
      return AlignSelf.FlexStart;
    case 'flex-end':
      return AlignSelf.FlexEnd;
    case 'center':
      return AlignSelf.Center;
    case 'stretch':
      return AlignSelf.Stretch;
    default:
      return AlignSelf.Auto;
  }
}

function toTaffyAlignContent(
  value: SupportedStyle['alignContent'],
): AlignContent | undefined {
  switch (value) {
    case 'start':
      return AlignContent.Start;
    case 'end':
      return AlignContent.End;
    case 'flex-start':
      return AlignContent.FlexStart;
    case 'flex-end':
      return AlignContent.FlexEnd;
    case 'center':
      return AlignContent.Center;
    case 'stretch':
      return AlignContent.Stretch;
    case 'space-between':
      return AlignContent.SpaceBetween;
    case 'space-around':
      return AlignContent.SpaceAround;
    case 'space-evenly':
      return AlignContent.SpaceEvenly;
    default:
      return undefined;
  }
}

function toTaffyJustifyContent(
  value: SupportedStyle['justifyContent'],
): JustifyContent | undefined {
  switch (value) {
    case 'start':
      return JustifyContent.Start;
    case 'end':
      return JustifyContent.End;
    case 'flex-start':
      return JustifyContent.FlexStart;
    case 'flex-end':
      return JustifyContent.FlexEnd;
    case 'center':
      return JustifyContent.Center;
    case 'space-between':
      return JustifyContent.SpaceBetween;
    case 'space-around':
      return JustifyContent.SpaceAround;
    case 'space-evenly':
      return JustifyContent.SpaceEvenly;
    default:
      return undefined;
  }
}

function toTaffyRect<Value extends number | `${number}%` | 'auto'>(
  edges: Edges<Value>,
): { left: Value; right: Value; top: Value; bottom: Value } {
  return {
    left: edges.left,
    right: edges.right,
    top: edges.top,
    bottom: edges.bottom,
  };
}

function intrinsicFallbackWidth(
  style: SupportedStyle,
  context: TaffyStyleContext | undefined,
): number | undefined {
  if (!context?.intrinsicReplaced) return context?.replacedSize?.width;
  // A natural width must remain a measured flex basis. Promoting it to a
  // specified width makes Taffy retain the pre-shrink ratio-derived height.
  if (context.intrinsicReplaced.ratioOnly || context.isFlexItem)
    return undefined;
  const ratio = replacedAspectRatio(style, context);
  return style.height !== undefined && ratio
    ? undefined
    : context.intrinsicReplaced.size.width;
}

function replacedAspectRatio(
  style: SupportedStyle,
  context: TaffyStyleContext | undefined,
): number | undefined {
  const intrinsic = context?.intrinsicReplaced?.aspectRatio;
  return style.aspectRatioIsHint
    ? (intrinsic ?? style.aspectRatio)
    : (style.aspectRatio ?? intrinsic);
}

function normalizeIntrinsicBoxSizing(
  taffy: Style,
  style: SupportedStyle,
  context: TaffyStyleContext | undefined,
): void {
  if (
    !context?.intrinsicReplaced ||
    !taffy.aspectRatio ||
    style.boxSizing !== 'border-box' ||
    (style.aspectRatio !== undefined && !style.aspectRatioIsHint)
  )
    return;
  const resolve = (
    value: number | `${number}%` | 'auto',
    basis: number | undefined,
  ): number | undefined =>
    typeof value === 'number'
      ? value
      : value !== 'auto' && basis !== undefined
        ? (Number.parseFloat(value) * basis) / 100
        : undefined;
  const padding = Object.values(taffy.padding).map(value =>
    resolve(value, context.percentageBasis?.width),
  );
  if (padding.some(value => value === undefined)) return;
  const horizontal =
    (resolve(taffy.padding.left, context.percentageBasis?.width) ?? 0) +
    (resolve(taffy.padding.right, context.percentageBasis?.width) ?? 0) +
    (resolve(taffy.border.left, context.percentageBasis?.width) ?? 0) +
    (resolve(taffy.border.right, context.percentageBasis?.width) ?? 0);
  const vertical =
    (resolve(taffy.padding.top, context.percentageBasis?.width) ?? 0) +
    (resolve(taffy.padding.bottom, context.percentageBasis?.width) ?? 0) +
    (resolve(taffy.border.top, context.percentageBasis?.width) ?? 0) +
    (resolve(taffy.border.bottom, context.percentageBasis?.width) ?? 0);
  const converted = [taffy.size, taffy.minSize, taffy.maxSize].map(
    (size, index) => {
      const width = resolve(size.width, context.percentageBasis?.width);
      const height = resolve(size.height, context.percentageBasis?.height);
      if (
        (size.width !== 'auto' && width === undefined) ||
        (size.height !== 'auto' && height === undefined)
      )
        return undefined;
      return {
        width:
          width === undefined
            ? ('auto' as const)
            : Math.max(
                0,
                width -
                  (index === 0 && style.width === undefined ? 0 : horizontal),
              ),
        height:
          height === undefined
            ? ('auto' as const)
            : Math.max(
                0,
                height -
                  (index === 0 && style.height === undefined ? 0 : vertical),
              ),
      };
    },
  );
  const [size, minSize, maxSize] = converted;
  if (!size || !minSize || !maxSize) return;
  // Natural replaced ratios always describe the content box. Taffy 0.14 has
  // only a CSS preferred ratio and applies it to the selected box-sizing box.
  // Translate definite border-box constraints before layout so native ratio
  // transfer operates on content dimensions, with padding/borders added once.
  taffy.boxSizing = BoxSizing.ContentBox;
  taffy.size = size;
  taffy.minSize = minSize;
  taffy.maxSize = maxSize;
}
