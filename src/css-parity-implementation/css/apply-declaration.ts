import type { Viewport } from '../../api/layout-engine-config.ts';
import {
  handleUnsupportedCss,
  type UnsupportedCssPolicy,
  type UnsupportedCssSource,
} from '../../api/unsupported-css-policy.ts';
import {
  type CustomProperties,
  resolveCustomPropertyValue,
} from './custom-properties.ts';
import {
  parseLengthPercentage,
  parseNumberCalculation,
} from './length-value.ts';
import type {
  AlignContentValue,
  AlignItemsValue,
  AlignSelfValue,
  BorderStyles,
  BorderStyleValue,
  Edges,
  FlexWrapValue,
  GridMaxTrackBreadth,
  GridMinTrackBreadth,
  GridPlacementValue,
  GridTemplateArea,
  GridTemplateTrack,
  GridTrack,
  JustifyContentValue,
  MarginValue,
  OverflowValue,
  SupportedDimension,
  SupportedStyle,
  SupportedTransform,
  TransformOrigin,
} from './supported-style.ts';

export type {
  AlignContentValue,
  AlignItemsValue,
  AlignSelfValue,
  BorderStyles,
  Edges,
  FlexWrapValue,
  GridMaxTrackBreadth,
  GridMinTrackBreadth,
  GridPlacementValue,
  GridTemplateTrack,
  GridTrack,
  JustifyContentValue,
  OverflowValue,
  SupportedDimension,
  SupportedStyle,
} from './supported-style.ts';
export { createDefaultStyle } from './supported-style.ts';

export type DeclarationContext = {
  policy?: UnsupportedCssPolicy;
  source: UnsupportedCssSource;
  selector?: string;
  element?: Element;
  rootFontSize?: number;
  fontSize?: number;
  viewport?: Viewport;
  customProperties?: CustomProperties;
};

export function applyDeclaration(
  style: SupportedStyle,
  property: string,
  value: string,
  context: DeclarationContext,
): void {
  context = { ...context, fontSize: style.fontSize };
  const normalizedProperty = property.trim().toLowerCase();

  if (
    normalizedProperty.startsWith('--') ||
    isTransitionProperty(normalizedProperty)
  ) {
    return;
  }

  const resolvedValue = resolveCustomPropertyValue(
    value,
    context.customProperties,
  );

  if (resolvedValue === undefined) {
    handleUnsupportedCss(context.policy, {
      property: normalizedProperty,
      value,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const normalizedValue = resolvedValue.trim().toLowerCase();

  switch (normalizedProperty) {
    case 'display':
      applyDisplay(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'position':
      if (normalizedValue === 'initial' || normalizedValue === 'unset') {
        style.position = 'static';
        return;
      }
      applyKeyword(
        style,
        'position',
        normalizedValue,
        ['static', 'relative', 'absolute', 'fixed', 'sticky'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'box-sizing':
      if (normalizedValue === 'initial' || normalizedValue === 'unset') {
        style.boxSizing = 'content-box';
        return;
      }
      applyKeyword(
        style,
        'boxSizing',
        normalizedValue,
        ['content-box', 'border-box'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex-direction':
      if (resetKeyword(style, 'flexDirection', normalizedValue, 'row')) {
        return;
      }
      applyKeyword(
        style,
        'flexDirection',
        normalizedValue,
        ['row', 'row-reverse', 'column', 'column-reverse'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex-wrap':
      if (resetKeyword(style, 'flexWrap', normalizedValue, 'nowrap')) {
        return;
      }
      applyKeyword(
        style,
        'flexWrap',
        normalizedValue,
        ['nowrap', 'wrap', 'wrap-reverse'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex-flow':
      if (normalizedValue === 'initial' || normalizedValue === 'unset') {
        style.flexDirection = 'row';
        style.flexWrap = 'nowrap';
        return;
      }
      applyFlexFlow(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'align-items':
      if (
        resetOptionalKeyword(style, 'alignItems', normalizedValue, undefined)
      ) {
        return;
      }
      applyKeyword(
        style,
        'alignItems',
        normalizedValue,
        ['start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'align-self':
      if (resetKeyword(style, 'alignSelf', normalizedValue, 'auto')) {
        return;
      }
      applyKeyword(
        style,
        'alignSelf',
        normalizedValue,
        ['auto', 'start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'align-content':
      if (
        resetOptionalKeyword(style, 'alignContent', normalizedValue, undefined)
      ) {
        return;
      }
      applyKeyword(
        style,
        'alignContent',
        normalizedValue,
        [
          'start',
          'end',
          'flex-start',
          'flex-end',
          'center',
          'stretch',
          'space-between',
          'space-around',
          'space-evenly',
        ],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'justify-content':
      if (
        resetOptionalKeyword(
          style,
          'justifyContent',
          normalizedValue,
          undefined,
        )
      ) {
        return;
      }
      applyKeyword(
        style,
        'justifyContent',
        normalizedValue,
        [
          'start',
          'end',
          'flex-start',
          'flex-end',
          'center',
          'space-between',
          'space-around',
          'space-evenly',
        ],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'justify-items':
      if (
        resetOptionalKeyword(style, 'justifyItems', normalizedValue, undefined)
      ) {
        return;
      }
      applyKeyword(
        style,
        'justifyItems',
        normalizedValue,
        ['start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'justify-self':
      if (
        resetOptionalKeyword(style, 'justifySelf', normalizedValue, undefined)
      ) {
        return;
      }
      applyKeyword(
        style,
        'justifySelf',
        normalizedValue,
        ['auto', 'start', 'end', 'flex-start', 'flex-end', 'center', 'stretch'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'place-content':
      applyPlaceContent(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'place-items':
      applyPlaceItems(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'place-self':
      applyPlaceSelf(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex-grow':
      if (resetNumber(style, 'flexGrow', normalizedValue, 0)) {
        return;
      }
      applyNumber(
        style,
        'flexGrow',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex-shrink':
      if (resetNumber(style, 'flexShrink', normalizedValue, 1)) {
        return;
      }
      applyNumber(
        style,
        'flexShrink',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex-basis':
      applyFlexBasis(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'flex':
      applyFlexShorthand(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'order':
      if (resetNumber(style, 'order', normalizedValue, 0)) {
        return;
      }
      applyInteger(
        style,
        'order',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'aspect-ratio':
      applyAspectRatio(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-auto-flow':
      if (resetKeyword(style, 'gridAutoFlow', normalizedValue, 'row')) {
        return;
      }
      applyGridAutoFlow(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-template-columns':
      applyGridTemplate(
        style,
        'gridTemplateColumns',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-template-rows':
      applyGridTemplate(
        style,
        'gridTemplateRows',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-template-areas':
      applyGridTemplateAreas(
        style,
        resolvedValue.trim(),
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-auto-columns':
      applyGridAutoTracks(
        style,
        'gridAutoColumns',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-auto-rows':
      applyGridAutoTracks(
        style,
        'gridAutoRows',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-column':
      if (
        resetGridLine(
          style,
          normalizedValue,
          'gridColumnStart',
          'gridColumnEnd',
        )
      ) {
        return;
      }
      applyGridLine(
        style,
        'gridColumnStart',
        'gridColumnEnd',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-row':
      if (resetGridLine(style, normalizedValue, 'gridRowStart', 'gridRowEnd')) {
        return;
      }
      applyGridLine(
        style,
        'gridRowStart',
        'gridRowEnd',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-area':
      if (normalizedValue === 'initial' || normalizedValue === 'unset') {
        style.gridRowStart = 'auto';
        style.gridColumnStart = 'auto';
        style.gridRowEnd = 'auto';
        style.gridColumnEnd = 'auto';
        return;
      }
      applyGridArea(
        style,
        resolvedValue.trim(),
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-column-start':
      if (resetGridPlacement(style, 'gridColumnStart', normalizedValue)) {
        return;
      }
      applyGridPlacement(
        style,
        'gridColumnStart',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-column-end':
      if (resetGridPlacement(style, 'gridColumnEnd', normalizedValue)) {
        return;
      }
      applyGridPlacement(
        style,
        'gridColumnEnd',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-row-start':
      if (resetGridPlacement(style, 'gridRowStart', normalizedValue)) {
        return;
      }
      applyGridPlacement(
        style,
        'gridRowStart',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'grid-row-end':
      if (resetGridPlacement(style, 'gridRowEnd', normalizedValue)) {
        return;
      }
      applyGridPlacement(
        style,
        'gridRowEnd',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'pointer-events':
      if (normalizedValue === 'inherit' || normalizedValue === 'unset') {
        return;
      }
      if (normalizedValue === 'initial') {
        style.pointerEvents = 'auto';
        return;
      }
      applyKeyword(
        style,
        'pointerEvents',
        normalizedValue,
        ['auto', 'none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'visibility':
      if (normalizedValue === 'inherit' || normalizedValue === 'unset') {
        return;
      }
      if (normalizedValue === 'initial') {
        style.visibility = 'visible';
        return;
      }
      applyVisibility(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'overflow':
      applyOverflow(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'overflow-x':
      applyKeyword(
        style,
        'overflowX',
        normalizedValue,
        ['visible', 'hidden', 'clip', 'auto', 'scroll'],
        normalizedProperty,
        value,
        context,
      );
      normalizeOverflowAxes(style);
      return;
    case 'overflow-y':
      applyKeyword(
        style,
        'overflowY',
        normalizedValue,
        ['visible', 'hidden', 'clip', 'auto', 'scroll'],
        normalizedProperty,
        value,
        context,
      );
      normalizeOverflowAxes(style);
      return;
    case 'opacity':
      applyOpacity(normalizedValue, normalizedProperty, value, context);
      return;
    case 'color':
    case 'background-color':
      applyVisualColor(normalizedValue, normalizedProperty, value, context);
      return;
    case 'background':
      applyVisualBackground(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'background-image':
      applyBackgroundImage(normalizedValue, normalizedProperty, value, context);
      return;
    case 'background-repeat':
      applyBackgroundRepeat(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'background-position':
      applyBackgroundPosition(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'background-size':
      applyBackgroundSize(normalizedValue, normalizedProperty, value, context);
      return;
    case 'background-origin':
    case 'background-clip':
      applyBackgroundBox(normalizedValue, normalizedProperty, value, context);
      return;
    case 'background-attachment':
      applyBackgroundAttachment(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'box-shadow':
      applyBoxShadow(normalizedValue, normalizedProperty, value, context);
      return;
    case 'border-color':
      applyVisualColors(normalizedValue, normalizedProperty, value, context);
      return;
    case 'border-inline-color':
    case 'border-block-color':
      applyVisualColors(normalizedValue, normalizedProperty, value, context);
      return;
    case 'border-top-color':
    case 'border-right-color':
    case 'border-bottom-color':
    case 'border-left-color':
    case 'border-inline-start-color':
    case 'border-inline-end-color':
    case 'border-block-start-color':
    case 'border-block-end-color':
    case 'outline-color':
      applyVisualColor(normalizedValue, normalizedProperty, value, context);
      return;
    case 'outline':
      applyOutline(normalizedValue, normalizedProperty, value, context);
      return;
    case 'outline-width':
      applyOutlineWidth(normalizedValue, normalizedProperty, value, context);
      return;
    case 'outline-style':
      applyOutlineStyle(normalizedValue, normalizedProperty, value, context);
      return;
    case 'outline-offset':
      applyOutlineOffset(normalizedValue, normalizedProperty, value, context);
      return;
    case 'text-decoration':
      applyTextDecoration(normalizedValue, normalizedProperty, value, context);
      return;
    case 'text-decoration-line':
      applyTextDecorationLine(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'text-decoration-color':
      applyVisualColor(normalizedValue, normalizedProperty, value, context);
      return;
    case 'text-decoration-style':
      applyKeywordOnly(
        normalizedValue,
        ['solid', 'double', 'dotted', 'dashed', 'wavy'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'text-decoration-thickness':
      applyTextDecorationThickness(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'filter':
    case 'backdrop-filter':
      applyVisualFilter(normalizedValue, normalizedProperty, value, context);
      return;
    case 'transform':
      applyTransform(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'translate':
      applyIndividualTranslate(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'scale':
      applyIndividualScale(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'transform-origin':
      applyTransformOrigin(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'will-change':
      applyWillChange(normalizedValue, normalizedProperty, value, context);
      return;
    case 'appearance':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'accent-color':
    case 'caret-color':
      applyAutoOrVisualColor(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'scroll-behavior':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'smooth'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'scrollbar-width':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'thin', 'none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'scrollbar-color':
      applyScrollbarColor(normalizedValue, normalizedProperty, value, context);
      return;
    case 'overscroll-behavior':
      applyOverscrollBehavior(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'overscroll-behavior-x':
    case 'overscroll-behavior-y':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'contain', 'none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'isolation':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'isolate'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'mix-blend-mode':
      applyKeywordOnly(
        normalizedValue,
        supportedBlendModes,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'list-style':
      applyListStyle(normalizedValue, normalizedProperty, value, context);
      return;
    case 'list-style-type':
      applyKeywordOnly(
        normalizedValue,
        ['none', 'disc', 'circle', 'square', 'decimal'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'list-style-position':
      applyKeywordOnly(
        normalizedValue,
        ['inside', 'outside'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'list-style-image':
      applyKeywordOnly(
        normalizedValue,
        ['none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'forced-color-adjust':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'none', 'preserve-parent-color'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'color-scheme':
      applyColorScheme(normalizedValue, normalizedProperty, value, context);
      return;
    case 'border-radius':
      applyBorderRadius(normalizedValue, normalizedProperty, value, context);
      return;
    case 'border-top-left-radius':
    case 'border-top-right-radius':
    case 'border-bottom-right-radius':
    case 'border-bottom-left-radius':
      applyBorderCornerRadius(
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'object-fit':
      applyKeywordOnly(
        normalizedValue,
        ['fill', 'contain', 'cover', 'none', 'scale-down'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'object-position':
      applyObjectPosition(normalizedValue, normalizedProperty, value, context);
      return;
    case 'cursor':
      applyKeywordOnly(
        normalizedValue,
        supportedCursorKeywords,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'user-select':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'text', 'none', 'contain', 'all'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'touch-action':
      applyTouchAction(normalizedValue, normalizedProperty, value, context);
      return;
    case 'resize':
      applyKeywordOnly(
        normalizedValue,
        ['none', 'both', 'horizontal', 'vertical', 'block', 'inline'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'direction':
      applyKeywordOnly(
        normalizedValue,
        ['ltr'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'writing-mode':
      applyKeywordOnly(
        normalizedValue,
        ['horizontal-tb'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'float':
    case 'clear':
      applyKeywordOnly(
        normalizedValue,
        ['none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'contain':
      applyKeywordOnly(
        normalizedValue,
        ['none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'container-type':
      applyKeywordOnly(
        normalizedValue,
        ['normal'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'container-name':
      applyKeywordOnly(
        normalizedValue,
        ['none'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'caption-side':
      applyKeyword(
        style,
        'captionSide',
        normalizedValue,
        ['top', 'bottom'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-collapse':
      applyKeyword(
        style,
        'borderCollapse',
        normalizedValue,
        ['separate', 'collapse'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'empty-cells':
      applyKeyword(
        style,
        'emptyCells',
        normalizedValue,
        ['show', 'hide'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-spacing':
      applyBorderSpacing(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'table-layout':
      applyKeywordOnly(
        normalizedValue,
        ['auto', 'fixed'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'vertical-align':
      applyKeywordOnly(
        normalizedValue,
        [
          'baseline',
          'top',
          'middle',
          'bottom',
          'sub',
          'super',
          'text-top',
          'text-bottom',
        ],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inline-size':
      applyLength(
        style,
        'width',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'block-size':
      applyLength(
        style,
        'height',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'min-inline-size':
      applyLength(
        style,
        'minWidth',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'min-block-size':
      applyLength(
        style,
        'minHeight',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'max-inline-size':
      applyLength(
        style,
        'maxWidth',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'max-block-size':
      applyLength(
        style,
        'maxHeight',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
    case 'width':
    case 'height':
      applyLength(
        style,
        normalizedProperty,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'min-width':
      applyLength(
        style,
        'minWidth',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'min-height':
      applyLength(
        style,
        'minHeight',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'max-width':
      applyLength(
        style,
        'maxWidth',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'max-height':
      applyLength(
        style,
        'maxHeight',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inset':
      applyInset(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'inset-inline':
      applyLogicalInset(
        style,
        'inline',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inset-block':
      applyLogicalInset(
        style,
        'block',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inset-inline-start':
      applyLength(
        style,
        'left',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inset-inline-end':
      applyLength(
        style,
        'right',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inset-block-start':
      applyLength(
        style,
        'top',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'inset-block-end':
      applyLength(
        style,
        'bottom',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'z-index':
      applyZIndex(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'padding':
      applyPaddingEdges(
        style.padding,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-inline':
      applyLogicalPaddingEdges(
        style.padding,
        'inline',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-block':
      applyLogicalPaddingEdges(
        style.padding,
        'block',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-inline-start':
      applyPaddingEdge(
        style.padding,
        'left',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-inline-end':
      applyPaddingEdge(
        style.padding,
        'right',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-block-start':
      applyPaddingEdge(
        style.padding,
        'top',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-block-end':
      applyPaddingEdge(
        style.padding,
        'bottom',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
      applyPaddingEdge(
        style.padding,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin':
      applyMarginEdges(
        style.margin,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-inline':
      applyLogicalMarginEdges(
        style.margin,
        'inline',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-block':
      applyLogicalMarginEdges(
        style.margin,
        'block',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-inline-start':
      applyMarginEdge(
        style.margin,
        'left',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-inline-end':
      applyMarginEdge(
        style.margin,
        'right',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-block-start':
      applyMarginEdge(
        style.margin,
        'top',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-block-end':
      applyMarginEdge(
        style.margin,
        'bottom',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
      applyMarginEdge(
        style.margin,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'gap':
      applyGap(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'row-gap':
      applyGapLength(
        style,
        'rowGap',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'column-gap':
      applyGapLength(
        style,
        'columnGap',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-width':
      applyBorderWidths(
        style.borderWidth,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-inline-width':
      applyLogicalEdges(
        style.borderWidth,
        'inline',
        normalizedValue,
        normalizedProperty,
        value,
        context,
        parseBorderWidth,
      );
      return;
    case 'border-block-width':
      applyLogicalEdges(
        style.borderWidth,
        'block',
        normalizedValue,
        normalizedProperty,
        value,
        context,
        parseBorderWidth,
      );
      return;
    case 'border-inline-start-width':
      applyBorderWidthEdge(
        style.borderWidth,
        'left',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-inline-end-width':
      applyBorderWidthEdge(
        style.borderWidth,
        'right',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-block-start-width':
      applyBorderWidthEdge(
        style.borderWidth,
        'top',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-block-end-width':
      applyBorderWidthEdge(
        style.borderWidth,
        'bottom',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
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
      );
      return;
    case 'border-style':
      applyBorderStyles(
        style.borderStyle,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-inline-style':
      applyLogicalBorderStyles(
        style.borderStyle,
        'inline',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-block-style':
      applyLogicalBorderStyles(
        style.borderStyle,
        'block',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-inline-start-style':
      applyBorderStyle(
        style.borderStyle,
        'left',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-inline-end-style':
      applyBorderStyle(
        style.borderStyle,
        'right',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-block-start-style':
      applyBorderStyle(
        style.borderStyle,
        'top',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-block-end-style':
      applyBorderStyle(
        style.borderStyle,
        'bottom',
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
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
      );
      return;
    case 'border':
      applyBorderShorthand(
        style,
        undefined,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'border-top':
    case 'border-right':
    case 'border-bottom':
    case 'border-left':
      applyBorderShorthand(
        style,
        edgeNameFromProperty(normalizedProperty),
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'font-family':
      if (normalizedValue === 'inherit' || normalizedValue === 'unset') {
        return;
      }
      if (normalizedValue === 'initial') {
        style.fontFamily = 'sans-serif';
        return;
      }
      style.fontFamily = value.trim();
      return;
    case 'font-size':
      applyFontSize(style, normalizedValue, normalizedProperty, value, context);
      return;
    case 'font-weight':
      applyFontWeight(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'letter-spacing':
      applyLetterSpacing(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'line-height':
      applyLineHeight(
        style,
        normalizedValue,
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'white-space':
      if (normalizedValue === 'inherit' || normalizedValue === 'unset') {
        return;
      }
      if (normalizedValue === 'initial') {
        style.whiteSpace = 'normal';
        return;
      }
      applyKeyword(
        style,
        'whiteSpace',
        normalizedValue,
        ['normal', 'pre', 'pre-line', 'pre-wrap', 'nowrap'],
        normalizedProperty,
        value,
        context,
      );
      return;
    case 'text-transform':
      if (normalizedValue === 'inherit' || normalizedValue === 'unset') {
        return;
      }
      if (normalizedValue === 'initial') {
        style.textTransform = 'none';
        return;
      }
      applyKeyword(
        style,
        'textTransform',
        normalizedValue,
        ['none', 'uppercase', 'lowercase', 'capitalize'],
        normalizedProperty,
        value,
        context,
      );
      return;
    default:
      handleUnsupportedCss(context.policy, {
        property: normalizedProperty,
        value,
        reason: 'unknown-property',
        source: context.source,
        selector: context.selector,
        element: context.element,
      });
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
  );
}

function applyFlexFlow(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  let direction: SupportedStyle['flexDirection'] | undefined;
  let wrap: FlexWrapValue | undefined;

  for (const part of parts) {
    if (isFlexDirectionValue(part)) {
      if (direction) {
        handleUnsupportedCss(context.policy, {
          property,
          value: originalValue,
          reason: 'unsupported-value',
          source: context.source,
          selector: context.selector,
          element: context.element,
        });
        return;
      }

      direction = part;
      continue;
    }

    if (isFlexWrapValue(part)) {
      if (wrap) {
        handleUnsupportedCss(context.policy, {
          property,
          value: originalValue,
          reason: 'unsupported-value',
          source: context.source,
          selector: context.selector,
          element: context.element,
        });
        return;
      }

      wrap = part;
      continue;
    }

    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.flexDirection = direction ?? 'row';
  style.flexWrap = wrap ?? 'nowrap';
}

function isFlexDirectionValue(
  value: string,
): value is SupportedStyle['flexDirection'] {
  return (
    value === 'row' ||
    value === 'row-reverse' ||
    value === 'column' ||
    value === 'column-reverse'
  );
}

function isFlexWrapValue(value: string): value is FlexWrapValue {
  return value === 'nowrap' || value === 'wrap' || value === 'wrap-reverse';
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
    case 'flow-root':
      style.display = value;
      return;
    case 'inline':
    case 'inline-block':
    case 'list-item':
      style.display = 'block';
      return;
    case 'table':
    case 'inline-table':
      style.display = 'table';
      return;
    case 'table-row-group':
    case 'table-header-group':
    case 'table-footer-group':
    case 'table-row':
    case 'table-cell':
    case 'table-caption':
    case 'table-column-group':
    case 'table-column':
      style.display = value;
      return;
    case 'contents':
      style.display = 'contents';
      return;
    case 'flex':
    case 'inline-flex':
      style.display = 'flex';
      return;
    case 'grid':
    case 'inline-grid':
      style.display = 'grid';
      return;
    case 'none':
      style.display = 'none';
      return;
    default:
      handleUnsupportedCss(context.policy, {
        property,
        value: originalValue,
        reason: 'unsupported-value',
        source: context.source,
        selector: context.selector,
        element: context.element,
      });
  }
}

function applyFontSize(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'inherit' || value === 'unset') {
    return;
  }

  if (value === 'initial') {
    applyFontSizeLength(style, 16);
    return;
  }

  const calculatedLength = parseLengthPercentage(value, context);

  if (typeof calculatedLength === 'number' && calculatedLength >= 0) {
    applyFontSizeLength(style, calculatedLength);
    return;
  }

  const length = parsePxLength(value);

  if (length !== undefined && length >= 0) {
    applyFontSizeLength(style, length);
    return;
  }

  const percentage = parsePercentage(value);

  if (percentage !== undefined && percentage >= 0) {
    applyFontSizeLength(style, style.fontSize * (percentage / 100));
    return;
  }

  const em = parseEmLength(value);

  if (em !== undefined && em >= 0) {
    applyFontSizeLength(style, style.fontSize * em);
    return;
  }

  const rem = parseRemLength(value);

  if (rem !== undefined && rem >= 0 && context.rootFontSize !== undefined) {
    applyFontSizeLength(style, context.rootFontSize * rem);
    return;
  }

  if (length === undefined || length < 0) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }
}

function applyFontSizeLength(style: SupportedStyle, length: number): void {
  const ratio = style.lineHeight / style.fontSize;
  style.fontSize = length;
  style.lineHeight = ratio * length;
}

function applyFontWeight(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'inherit' || value === 'unset') return;
  if (value === 'initial' || value === 'normal') {
    style.fontWeight = 400;
    return;
  }
  if (value === 'bold') {
    style.fontWeight = 700;
    return;
  }
  const weight = Number(value);
  if (Number.isInteger(weight) && weight >= 1 && weight <= 1000) {
    style.fontWeight = weight;
    return;
  }
  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyLetterSpacing(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'inherit' || value === 'unset') return;
  if (value === 'initial' || value === 'normal') {
    style.letterSpacing = 0;
    return;
  }
  const length = parseDimension(value, context);
  if (typeof length === 'number') {
    style.letterSpacing = length;
    return;
  }
  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyLineHeight(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'inherit' || value === 'unset') {
    return;
  }

  if (value === 'normal') {
    style.lineHeight = style.fontSize * 1.2;
    return;
  }

  const calculatedLength = parseLengthPercentage(value, context);

  if (typeof calculatedLength === 'number' && calculatedLength >= 0) {
    style.lineHeight = calculatedLength;
    return;
  }

  const pxLength = parsePxLength(value);

  if (pxLength !== undefined && pxLength >= 0) {
    style.lineHeight = pxLength;
    return;
  }

  const percentage = parsePercentage(value);

  if (percentage !== undefined && percentage >= 0) {
    style.lineHeight = (percentage / 100) * style.fontSize;
    return;
  }

  const emLength = parseEmLength(value);

  if (emLength !== undefined && emLength >= 0) {
    style.lineHeight = emLength * style.fontSize;
    return;
  }

  const remLength = parseRemLength(value);

  if (
    remLength !== undefined &&
    remLength >= 0 &&
    context.rootFontSize !== undefined
  ) {
    style.lineHeight = remLength * context.rootFontSize;
    return;
  }

  const multiplier = Number(value);

  if (Number.isFinite(multiplier) && multiplier >= 0) {
    style.lineHeight = multiplier * style.fontSize;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyOverflow(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const [x, y = x] = parts;

  if (isOverflowValue(x) && isOverflowValue(y)) {
    style.overflowX = x;
    style.overflowY = y;
    normalizeOverflowAxes(style);
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isOverflowValue(value: string | undefined): value is OverflowValue {
  return (
    value === 'visible' ||
    value === 'hidden' ||
    value === 'clip' ||
    value === 'auto' ||
    value === 'scroll'
  );
}

function applyVisibility(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'visible' || value === 'hidden' || value === 'collapse') {
    style.visibility = value;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function normalizeOverflowAxes(style: SupportedStyle): void {
  // Browsers compute visible to auto when the opposite axis clips overflow.
  // This matters here because hit boxes use the computed overflow axes as clipping flags.
  if (style.overflowX === 'visible' && isClippingOverflow(style.overflowY)) {
    style.overflowX = 'auto';
  }

  if (style.overflowY === 'visible' && isClippingOverflow(style.overflowX)) {
    style.overflowY = 'auto';
  }
}

function isClippingOverflow(value: OverflowValue): boolean {
  return value === 'hidden' || value === 'auto' || value === 'scroll';
}

function applyOpacity(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const opacity = Number(value);

  if (Number.isFinite(opacity) && opacity >= 0 && opacity <= 1) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyVisualColor(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (isVisualColorToken(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyVisualColors(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    parts.length >= 1 &&
    parts.length <= 4 &&
    parts.every(isVisualColorToken)
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyVisualBackground(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || isVisualColorToken(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyBackgroundImage(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    cssWideKeywords.has(value) ||
    splitCssCommaList(value).every(layer => layer === 'none')
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyBackgroundRepeat(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    cssWideKeywords.has(value) ||
    splitCssCommaList(value).every(isBackgroundRepeatLayer)
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isBackgroundRepeatLayer(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean);
  const keywords = [
    'repeat',
    'repeat-x',
    'repeat-y',
    'space',
    'round',
    'no-repeat',
  ];

  return (
    parts.length >= 1 &&
    parts.length <= 2 &&
    parts.every(part => keywords.includes(part))
  );
}

function applyBackgroundPosition(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    cssWideKeywords.has(value) ||
    splitCssCommaList(value).every(isPositionLayer)
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isPositionLayer(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean);
  return (
    parts.length >= 1 && parts.length <= 4 && parts.every(isObjectPositionPart)
  );
}

function applyBackgroundSize(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    cssWideKeywords.has(value) ||
    splitCssCommaList(value).every(isBackgroundSizeLayer)
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isBackgroundSizeLayer(value: string): boolean {
  if (value === 'cover' || value === 'contain') {
    return true;
  }

  const parts = value.split(/\s+/).filter(Boolean);
  return (
    parts.length >= 1 &&
    parts.length <= 2 &&
    parts.every(
      part => part === 'auto' || parseNonNegativeDimension(part) !== undefined,
    )
  );
}

function applyBackgroundBox(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const boxes = ['border-box', 'padding-box', 'content-box'];

  if (
    cssWideKeywords.has(value) ||
    splitCssCommaList(value).every(layer => boxes.includes(layer))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyBackgroundAttachment(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const attachments = ['scroll', 'fixed', 'local'];

  if (
    cssWideKeywords.has(value) ||
    splitCssCommaList(value).every(layer => attachments.includes(layer))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyBoxShadow(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || value === 'none' || parseBoxShadow(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function parseBoxShadow(value: string): boolean {
  return splitCssCommaList(value).every(parseSingleBoxShadow);
}

function splitCssCommaList(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    }

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts.filter(Boolean);
}

function splitCssWhitespaceList(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    }

    if (/\s/.test(char) && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }

      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseSingleBoxShadow(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return false;
  }

  let lengths = 0;
  let color = false;
  let inset = false;

  for (const part of parts) {
    if (part === 'inset') {
      if (inset) {
        return false;
      }

      inset = true;
      continue;
    }

    if (parsePxLength(part) !== undefined) {
      lengths += 1;

      if (lengths > 4) {
        return false;
      }

      continue;
    }

    if (isVisualColorToken(part)) {
      if (color) {
        return false;
      }

      color = true;
      continue;
    }

    return false;
  }

  return lengths >= 2;
}

function applyOutline(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseOutline(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyOutlineWidth(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseBorderWidth(value) !== undefined) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyOutlineStyle(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || isKnownLineStyle(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyOutlineOffset(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parsePxLength(value) !== undefined) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyBorderRadius(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseBorderRadius(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyTextDecoration(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || parseTextDecoration(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function parseTextDecoration(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  let line = false;
  let style = false;
  let color = false;
  let thickness = false;

  for (const part of parts) {
    if (isTextDecorationLinePart(part)) {
      if (line) {
        return false;
      }

      line = true;
      continue;
    }

    if (['solid', 'double', 'dotted', 'dashed', 'wavy'].includes(part)) {
      if (style) {
        return false;
      }

      style = true;
      continue;
    }

    if (isVisualColorToken(part)) {
      if (color) {
        return false;
      }

      color = true;
      continue;
    }

    if (
      part === 'auto' ||
      part === 'from-font' ||
      parseNonNegativeDimension(part) !== undefined
    ) {
      if (thickness) {
        return false;
      }

      thickness = true;
      continue;
    }

    return false;
  }

  return true;
}

function applyTextDecorationLine(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    cssWideKeywords.has(value) ||
    (parts.length > 0 && parts.every(isTextDecorationLinePart))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isTextDecorationLinePart(value: string): boolean {
  return ['none', 'underline', 'overline', 'line-through', 'blink'].includes(
    value,
  );
}

function applyTextDecorationThickness(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    cssWideKeywords.has(value) ||
    value === 'auto' ||
    value === 'from-font' ||
    parseNonNegativeDimension(value) !== undefined
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyVisualFilter(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    cssWideKeywords.has(value) ||
    value === 'none' ||
    parseVisualFilter(value)
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyTransform(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || value === '[]') {
    style.transform = [];
    return;
  }

  if (value === 'initial' || value === 'unset') {
    style.transform = [];
    return;
  }

  const transform = parseTransformList(value);
  if (transform) {
    style.transform = transform;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function parseTransformList(value: string): SupportedTransform[] | undefined {
  const transforms: SupportedTransform[] = [];
  const functionPattern = /([a-z][a-z0-9]*)\(([^()]*)\)/gi;
  let consumed = 0;

  for (const match of value.matchAll(functionPattern)) {
    if (
      match.index === undefined ||
      value.slice(consumed, match.index).trim() !== ''
    ) {
      return undefined;
    }

    const transform = parseTransformFunction(
      match[1]?.toLowerCase() ?? '',
      match[2] ?? '',
    );
    if (!transform) {
      return undefined;
    }

    transforms.push(transform);
    consumed = match.index + match[0].length;
  }

  return transforms.length > 0 && value.slice(consumed).trim() === ''
    ? transforms
    : undefined;
}

function parseTransformFunction(
  name: string,
  value: string,
): SupportedTransform | undefined {
  const parts = value.split(/\s*,\s*|\s+/).filter(Boolean);

  switch (name) {
    case 'translate': {
      const x = parseDimension(parts[0] ?? '');
      const y = parts.length === 1 ? 0 : parseDimension(parts[1] ?? '');
      return parts.length <= 2 && x !== undefined && y !== undefined
        ? { type: 'translate', x, y }
        : undefined;
    }
    case 'translatex': {
      const x = parseDimension(parts[0] ?? '');
      return parts.length === 1 && x !== undefined
        ? { type: 'translate', x, y: 0 }
        : undefined;
    }
    case 'translatey': {
      const y = parseDimension(parts[0] ?? '');
      return parts.length === 1 && y !== undefined
        ? { type: 'translate', x: 0, y }
        : undefined;
    }
    case 'scale': {
      const x = parseFiniteNumber(parts[0] ?? '');
      const y = parts.length === 1 ? x : parseFiniteNumber(parts[1] ?? '');
      return parts.length <= 2 && x !== undefined && y !== undefined
        ? { type: 'scale', x, y }
        : undefined;
    }
    case 'scalex': {
      const x = parseFiniteNumber(parts[0] ?? '');
      return parts.length === 1 && x !== undefined
        ? { type: 'scale', x, y: 1 }
        : undefined;
    }
    case 'scaley': {
      const y = parseFiniteNumber(parts[0] ?? '');
      return parts.length === 1 && y !== undefined
        ? { type: 'scale', x: 1, y }
        : undefined;
    }
    case 'rotate': {
      const radians = parseAngle(parts[0] ?? '');
      return parts.length === 1 && radians !== undefined
        ? { type: 'rotate', radians }
        : undefined;
    }
    case 'skew': {
      const xRadians = parseAngle(parts[0] ?? '');
      const yRadians = parts.length === 1 ? 0 : parseAngle(parts[1] ?? '');
      return parts.length <= 2 &&
        xRadians !== undefined &&
        yRadians !== undefined
        ? { type: 'skew', xRadians, yRadians }
        : undefined;
    }
    case 'skewx': {
      const xRadians = parseAngle(parts[0] ?? '');
      return parts.length === 1 && xRadians !== undefined
        ? { type: 'skew', xRadians, yRadians: 0 }
        : undefined;
    }
    case 'skewy': {
      const yRadians = parseAngle(parts[0] ?? '');
      return parts.length === 1 && yRadians !== undefined
        ? { type: 'skew', xRadians: 0, yRadians }
        : undefined;
    }
    case 'matrix': {
      if (parts.length !== 6) return undefined;
      const [a, b, c, d, e, f] = parts.map(parseFiniteNumber);
      if (
        a === undefined ||
        b === undefined ||
        c === undefined ||
        d === undefined ||
        e === undefined ||
        f === undefined
      ) {
        return undefined;
      }
      return { type: 'matrix', a, b, c, d, e, f };
    }
    case 'translatez':
      return parts.length === 1 && parsePxLength(parts[0] ?? '') === 0
        ? { type: 'translate', x: 0, y: 0 }
        : undefined;
    default:
      return undefined;
  }
}

function parseAngle(value: string): number | undefined {
  const match = /^(-?\d+(?:\.\d+)?)(deg|grad|rad|turn)$/.exec(value);
  if (!match) return value === '0' ? 0 : undefined;
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'deg':
      return (amount * Math.PI) / 180;
    case 'grad':
      return (amount * Math.PI) / 200;
    case 'rad':
      return amount;
    case 'turn':
      return amount * Math.PI * 2;
    default:
      return undefined;
  }
}

function parseFiniteNumber(value: string): number | undefined {
  const number = Number(value);
  return value.trim() !== '' && Number.isFinite(number) ? number : undefined;
}

function applyIndividualTranslate(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || value === 'initial' || value === 'unset') {
    style.translate = undefined;
    return;
  }

  const parts = value.split(/\s+/).filter(Boolean);
  const x = parseDimension(parts[0] ?? '');
  const y = parts.length === 1 ? 0 : parseDimension(parts[1] ?? '');

  if (parts.length <= 2 && x !== undefined && y !== undefined) {
    style.translate = { type: 'translate', x, y };
    return;
  }

  reportUnsupportedTransformProperty(property, originalValue, context);
}

function applyIndividualScale(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'none' || value === 'initial' || value === 'unset') {
    style.scale = undefined;
    return;
  }

  const parts = value.split(/\s+/).filter(Boolean);
  const x = parseScaleFactor(parts[0] ?? '');
  const y = parts.length === 1 ? x : parseScaleFactor(parts[1] ?? '');

  if (parts.length <= 2 && x !== undefined && y !== undefined) {
    style.scale = { type: 'scale', x, y };
    return;
  }

  reportUnsupportedTransformProperty(property, originalValue, context);
}

function parseScaleFactor(value: string): number | undefined {
  const percentage = parsePercentage(value);
  return percentage === undefined ? parseFiniteNumber(value) : percentage / 100;
}

function reportUnsupportedTransformProperty(
  property: string,
  value: string,
  context: DeclarationContext,
): void {
  handleUnsupportedCss(context.policy, {
    property,
    value,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function parseVisualFilter(value: string): boolean {
  if (value.includes('url(')) {
    return false;
  }

  return /^[-a-z]+\(.*\)(\s+[-a-z]+\(.*\))*$/.test(value);
}

function applyTransformOrigin(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'initial' || value === 'unset') {
    style.transformOrigin = { x: '50%', y: '50%' };
    return;
  }

  const origin = parseTransformOrigin(value);
  if (origin) {
    style.transformOrigin = origin;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function parseTransformOrigin(value: string): TransformOrigin | undefined {
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) {
    return undefined;
  }

  if (parts.length === 1) {
    const part = parts[0] ?? '';
    if (part === 'top' || part === 'bottom') {
      return { x: '50%', y: originKeyword(part) };
    }
    const x = originHorizontal(part);
    return x === undefined ? undefined : { x, y: '50%' };
  }

  let [horizontal, vertical] = parts;
  if (horizontal === 'top' || horizontal === 'bottom') {
    [horizontal, vertical] = [vertical, horizontal];
  }

  const x = originHorizontal(horizontal ?? '');
  const y = originVertical(vertical ?? '');
  return x === undefined || y === undefined ? undefined : { x, y };
}

function originHorizontal(value: string): SupportedDimension | undefined {
  if (value === 'left' || value === 'right' || value === 'center') {
    return originKeyword(value);
  }
  return parseDimension(value);
}

function originVertical(value: string): SupportedDimension | undefined {
  if (value === 'top' || value === 'bottom' || value === 'center') {
    return originKeyword(value);
  }
  return parseDimension(value);
}

function originKeyword(
  value: 'left' | 'right' | 'top' | 'bottom' | 'center',
): `${number}%` {
  if (value === 'left' || value === 'top') {
    return '0%';
  }
  return value === 'center' ? '50%' : '100%';
}

function applyWillChange(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssCommaList(value);

  if (
    cssWideKeywords.has(value) ||
    value === 'auto' ||
    (parts.length > 0 && parts.every(part => /^[a-z-]+$/.test(part)))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyAutoOrVisualColor(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto' || isVisualColorToken(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyScrollbarColor(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    cssWideKeywords.has(value) ||
    value === 'auto' ||
    (parts.length === 2 && parts.every(isVisualColorToken))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyOverscrollBehavior(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    cssWideKeywords.has(value) ||
    (parts.length >= 1 &&
      parts.length <= 2 &&
      parts.every(part => ['auto', 'contain', 'none'].includes(part)))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyListStyle(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);
  const keywords = [
    'none',
    'disc',
    'circle',
    'square',
    'decimal',
    'inside',
    'outside',
  ];

  if (
    cssWideKeywords.has(value) ||
    (parts.length > 0 && parts.every(part => keywords.includes(part)))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyColorScheme(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    cssWideKeywords.has(value) ||
    (parts.length > 0 &&
      parts.every(part => ['normal', 'light', 'dark', 'only'].includes(part)))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
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
];

function applyBorderCornerRadius(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    cssWideKeywords.has(value) ||
    (parts.length >= 1 &&
      parts.length <= 2 &&
      parts.every(part => parseNonNegativeDimension(part) !== undefined))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function parseBorderRadius(value: string): boolean {
  const parts = value.split('/').map(part => part.trim());

  if (parts.length < 1 || parts.length > 2) {
    return false;
  }

  return parts.every(part => {
    const radii = part.split(/\s+/).filter(Boolean);
    return (
      radii.length >= 1 &&
      radii.length <= 4 &&
      radii.every(radius => parseNonNegativeDimension(radius) !== undefined)
    );
  });
}

function applyKeywordOnly(
  value: string,
  supported: readonly string[],
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (cssWideKeywords.has(value) || supported.includes(value)) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyObjectPosition(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (
    cssWideKeywords.has(value) ||
    (parts.length >= 1 &&
      parts.length <= 4 &&
      parts.every(isObjectPositionPart))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isObjectPositionPart(value: string): boolean {
  return (
    ['left', 'right', 'top', 'bottom', 'center'].includes(value) ||
    parseDimension(value) !== undefined
  );
}

function applyTouchAction(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);
  const supported = [
    'auto',
    'none',
    'manipulation',
    'pan-x',
    'pan-y',
    'pan-left',
    'pan-right',
    'pan-up',
    'pan-down',
    'pinch-zoom',
  ];

  if (
    cssWideKeywords.has(value) ||
    (parts.length >= 1 &&
      parts.length <= 3 &&
      parts.every(part => supported.includes(part)))
  ) {
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
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
];

function parseOutline(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  let width = false;
  let style = false;
  let color = false;

  for (const part of parts) {
    if (parseBorderWidth(part) !== undefined) {
      if (width) {
        return false;
      }

      width = true;
      continue;
    }

    if (isKnownLineStyle(part)) {
      if (style) {
        return false;
      }

      style = true;
      continue;
    }

    if (isVisualColorToken(part)) {
      if (color) {
        return false;
      }

      color = true;
      continue;
    }

    return false;
  }

  return true;
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
  ].includes(value);
}

function isVisualColorToken(value: string): boolean {
  return (
    basicNamedColors.has(value) ||
    cssWideKeywords.has(value) ||
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^(?:rgb|rgba|hsl|hsla)\(.+\)$/.test(value)
  );
}

function applyPaddingEdges(
  edges: Edges<SupportedDimension>,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const lengths = parseEdgeLengths(
    value,
    property,
    originalValue,
    context,
    part => parsePaddingLength(part, context),
  );

  if (!lengths) {
    return;
  }

  edges.top = lengths.top;
  edges.right = lengths.right;
  edges.bottom = lengths.bottom;
  edges.left = lengths.left;
}

function applyPaddingEdge(
  edges: Edges<SupportedDimension>,
  edge: keyof Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length =
    edge === 'left' || edge === 'right'
      ? parsePaddingLength(value, context)
      : parsePaddingLength(value, context);

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  edges[edge] = length;
}

function applyMarginEdges(
  edges: Edges<MarginValue>,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const lengths = parseEdgeLengths(
    value,
    property,
    originalValue,
    context,
    part => parseMarginLength(part, context),
  );

  if (!lengths) {
    return;
  }

  edges.top = lengths.top;
  edges.right = lengths.right;
  edges.bottom = lengths.bottom;
  edges.left = lengths.left;
}

function applyMarginEdge(
  edges: Edges<MarginValue>,
  edge: keyof Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parseMarginLength(value, context);

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  edges[edge] = length;
}

function applyBorderWidths(
  edges: Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const lengths = parseEdgeLengths(
    value,
    property,
    originalValue,
    context,
    parseBorderWidth,
  );

  if (!lengths) {
    return;
  }

  edges.top = lengths.top;
  edges.right = lengths.right;
  edges.bottom = lengths.bottom;
  edges.left = lengths.left;
}

function applyLogicalEdges<Value>(
  edges: Edges<Value>,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
  parseLength: (value: string) => Value | undefined,
): void {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const start = parseLength(parts[0] ?? '');
  const end = parseLength(parts[1] ?? parts[0] ?? '');

  if (start === undefined || end === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  if (axis === 'inline') {
    edges.left = start;
    edges.right = end;
    return;
  }

  edges.top = start;
  edges.bottom = end;
}

function applyLogicalMarginEdges(
  edges: Edges<MarginValue>,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  applyLogicalEdges(
    edges,
    axis,
    value,
    property,
    originalValue,
    context,
    part => parseMarginLength(part, context),
  );
}

function applyLogicalPaddingEdges(
  edges: Edges<SupportedDimension>,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  applyLogicalEdges(
    edges,
    axis,
    value,
    property,
    originalValue,
    context,
    part => parsePaddingLength(part, context),
  );
}

function applyBorderWidthEdge(
  edges: Edges,
  edge: keyof Edges,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parseBorderWidth(value);

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  edges[edge] = length;
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
    style[key] = value as SupportedStyle[Key];
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function resetKeyword<Key extends keyof SupportedStyle>(
  style: SupportedStyle,
  key: Key,
  value: string,
  initialValue: SupportedStyle[Key],
): boolean {
  if (value !== 'initial' && value !== 'unset') {
    return false;
  }

  style[key] = initialValue;
  return true;
}

function resetOptionalKeyword<Key extends keyof SupportedStyle>(
  style: SupportedStyle,
  key: Key,
  value: string,
  initialValue: SupportedStyle[Key],
): boolean {
  return resetKeyword(style, key, value, initialValue);
}

function resetNumber<Key extends keyof SupportedStyle>(
  style: SupportedStyle,
  key: Key,
  value: string,
  initialValue: Extract<SupportedStyle[Key], number>,
): boolean {
  if (value !== 'initial' && value !== 'unset') {
    return false;
  }

  style[key] = initialValue as SupportedStyle[Key];
  return true;
}

function resetGridLine(
  style: SupportedStyle,
  value: string,
  startKey: 'gridColumnStart' | 'gridRowStart',
  endKey: 'gridColumnEnd' | 'gridRowEnd',
): boolean {
  if (value !== 'initial' && value !== 'unset') {
    return false;
  }

  style[startKey] = 'auto';
  style[endKey] = 'auto';
  return true;
}

function resetGridPlacement(
  style: SupportedStyle,
  key: 'gridColumnStart' | 'gridColumnEnd' | 'gridRowStart' | 'gridRowEnd',
  value: string,
): boolean {
  if (value !== 'initial' && value !== 'unset') {
    return false;
  }

  style[key] = 'auto';
  return true;
}

function applyPlaceContent(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const align = parts[0] ?? '';
  const justify = parts[1] ?? align;

  if (isAlignContentValue(align) && isJustifyContentValue(justify)) {
    style.alignContent = align;
    style.justifyContent = justify;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyPlaceItems(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const align = parts[0] ?? '';
  const justify = parts[1] ?? align;

  if (isAlignItemsValue(align) && isAlignItemsValue(justify)) {
    style.alignItems = align;
    style.justifyItems = justify;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyPlaceSelf(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const align = parts[0] ?? '';
  const justify = parts[1] ?? align;

  if (isAlignSelfValue(align) && isAlignSelfValue(justify)) {
    style.alignSelf = align;
    style.justifySelf = justify;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function isAlignItemsValue(value: string): value is AlignItemsValue {
  return [
    'start',
    'end',
    'flex-start',
    'flex-end',
    'center',
    'stretch',
  ].includes(value);
}

function isAlignSelfValue(value: string): value is AlignSelfValue {
  return value === 'auto' || isAlignItemsValue(value);
}

function isJustifyContentValue(value: string): value is JustifyContentValue {
  return [
    'start',
    'end',
    'flex-start',
    'flex-end',
    'center',
    'space-between',
    'space-around',
    'space-evenly',
  ].includes(value);
}

function isAlignContentValue(value: string): value is AlignContentValue {
  return value === 'stretch' || isJustifyContentValue(value);
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
      style[key] = undefined;
      return;
    }

    const length = parseDimension(value, context);

    if (length === undefined) {
      handleUnsupportedCss(context.policy, {
        property,
        value: originalValue,
        reason: 'unsupported-value',
        source: context.source,
        selector: context.selector,
        element: context.element,
      });
      return;
    }

    style[key] = length;
    return;
  }

  if (
    value === 'auto' &&
    (key === 'width' ||
      key === 'height' ||
      key === 'minWidth' ||
      key === 'minHeight')
  ) {
    style[key] = undefined;
    return;
  }

  if (value === 'none' && (key === 'maxWidth' || key === 'maxHeight')) {
    style[key] = undefined;
    return;
  }

  const length = parseDimension(value, context);

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = length;
}

function applyBorderSpacing(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const horizontal = parsePxLength(parts[0]);
  const vertical = parsePxLength(parts[1] ?? parts[0]);

  if (
    horizontal === undefined ||
    vertical === undefined ||
    horizontal < 0 ||
    vertical < 0
  ) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.tableBorderSpacing = { horizontal, vertical };
}

function isInsetLengthKey(
  key: Parameters<typeof applyLength>[1],
): key is 'left' | 'right' | 'top' | 'bottom' {
  return key === 'left' || key === 'right' || key === 'top' || key === 'bottom';
}

function applyNumber(
  style: SupportedStyle,
  key: 'flexGrow' | 'flexShrink',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = number;
}

function applyInteger(
  style: SupportedStyle,
  key: 'order',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = number;
}

function applyFlexBasis(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.flexBasis = undefined;
    return;
  }

  const length = parseNonNegativeDimension(value);

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.flexBasis = length;
}

function applyFlexShorthand(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.flexGrow = 1;
    style.flexShrink = 1;
    style.flexBasis = undefined;
    return;
  }

  if (value === 'none') {
    style.flexGrow = 0;
    style.flexShrink = 0;
    style.flexBasis = undefined;
    return;
  }

  if (value === 'initial') {
    style.flexGrow = 0;
    style.flexShrink = 1;
    style.flexBasis = undefined;
    return;
  }

  const parts = value.split(/\s+/).filter(Boolean);
  const parsed = parseFlexShorthand(parts);

  if (!parsed) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.flexGrow = parsed.grow;
  style.flexShrink = parsed.shrink;
  style.flexBasis = parsed.basis;
}

function applyAspectRatio(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.aspectRatio = undefined;
    return;
  }

  const ratio = parseAspectRatio(value);

  if (ratio === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.aspectRatio = ratio;
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
    style[key] = [];
    return;
  }

  const tracks = splitCssWhitespaceList(value).map(parseGridTemplateTrack);

  if (tracks.length === 0 || tracks.some(track => track === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = tracks as GridTemplateTrack[];
}

function applyGridAutoTracks(
  style: SupportedStyle,
  key: 'gridAutoColumns' | 'gridAutoRows',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const tracks = splitCssWhitespaceList(value).map(parseGridTrack);

  if (tracks.length === 0 || tracks.some(track => track === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = tracks as GridTrack[];
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
  const parts = value
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const start = parseGridPlacement(parts[0] ?? '');
  const end = parts.length === 2 ? parseGridPlacement(parts[1] ?? '') : 'auto';

  if (start === undefined || end === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[startKey] = start;
  style[endKey] = end;
}

function applyGridTemplateAreas(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (
    value.toLowerCase() === 'none' ||
    value.toLowerCase() === 'initial' ||
    value.toLowerCase() === 'unset'
  ) {
    style.gridTemplateAreas = undefined;
    style.gridTemplateAreaRowCount = undefined;
    style.gridTemplateAreaColumnCount = undefined;
    return;
  }

  const rows = [...value.matchAll(/(["'])(.*?)\1/g)].map(match =>
    (match[2] ?? '').trim().split(/\s+/),
  );
  const withoutRows = value.replace(/(["'])(.*?)\1/g, '').trim();

  if (
    rows.length === 0 ||
    withoutRows !== '' ||
    rows[0]?.length === 0 ||
    rows.some(row => row.length !== rows[0]?.length)
  ) {
    reportUnsupportedDeclaration(property, originalValue, context);
    return;
  }

  const areas = new Map<string, GridTemplateArea>();

  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, name] of row.entries()) {
      if (name === '.' || /^\.+$/.test(name)) {
        continue;
      }

      if (!isGridAreaName(name)) {
        reportUnsupportedDeclaration(property, originalValue, context);
        return;
      }

      const area = areas.get(name);

      if (area) {
        area.rowStart = Math.min(area.rowStart, rowIndex + 1);
        area.rowEnd = Math.max(area.rowEnd, rowIndex + 2);
        area.columnStart = Math.min(area.columnStart, columnIndex + 1);
        area.columnEnd = Math.max(area.columnEnd, columnIndex + 2);
      } else {
        areas.set(name, {
          rowStart: rowIndex + 1,
          rowEnd: rowIndex + 2,
          columnStart: columnIndex + 1,
          columnEnd: columnIndex + 2,
        });
      }
    }
  }

  for (const [name, area] of areas) {
    for (let row = area.rowStart - 1; row < area.rowEnd - 1; row += 1) {
      for (
        let column = area.columnStart - 1;
        column < area.columnEnd - 1;
        column += 1
      ) {
        if (rows[row]?.[column] !== name) {
          reportUnsupportedDeclaration(property, originalValue, context);
          return;
        }
      }
    }
  }

  style.gridTemplateAreas = areas;
  style.gridTemplateAreaRowCount = rows.length;
  style.gridTemplateAreaColumnCount = rows[0]?.length;
}

function reportUnsupportedDeclaration(
  property: string,
  value: string,
  context: DeclarationContext,
): void {
  handleUnsupportedCss(context.policy, {
    property,
    value,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyGridArea(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 1 && isGridAreaName(parts[0] ?? '')) {
    const area = { area: parts[0] ?? '' };
    style.gridRowStart = area;
    style.gridColumnStart = area;
    style.gridRowEnd = area;
    style.gridColumnEnd = area;
    return;
  }

  if (parts.length !== 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const [rowStart, columnStart, rowEnd, columnEnd] = parts.map(part =>
    parseGridPlacement(part, true),
  );

  if (
    rowStart === undefined ||
    columnStart === undefined ||
    rowEnd === undefined ||
    columnEnd === undefined
  ) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.gridRowStart = rowStart;
  style.gridColumnStart = columnStart;
  style.gridRowEnd = rowEnd;
  style.gridColumnEnd = columnEnd;
}

function applyGridPlacement(
  style: SupportedStyle,
  key: 'gridColumnStart' | 'gridColumnEnd' | 'gridRowStart' | 'gridRowEnd',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const placement = parseGridPlacement(value);

  if (placement === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = placement;
}

function parseGridPlacement(
  value: string,
  allowArea = false,
): GridPlacementValue | undefined {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue === 'auto') {
    return 'auto';
  }

  const span = parseGridSpan(normalizedValue);

  if (span) {
    return span;
  }

  const number = Number(value);
  if (Number.isInteger(number) && number !== 0) {
    return number;
  }

  return allowArea && isGridAreaName(value) ? { area: value } : undefined;
}

const reservedGridAreaNames = new Set([
  'auto',
  'default',
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'span',
  'unset',
]);

function isGridAreaName(value: string): boolean {
  return (
    /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/.test(value) &&
    !reservedGridAreaNames.has(value.toLowerCase())
  );
}

function parseGridSpan(value: string): { span: number } | undefined {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length !== 2 || parts[0] !== 'span') {
    return undefined;
  }

  const span = Number(parts[1]);
  return Number.isInteger(span) && span > 0 ? { span } : undefined;
}

function applyGridAutoFlow(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);
  const direction =
    parts.find(part => part === 'row' || part === 'column') ?? 'row';
  const hasDense = parts.includes('dense');
  const unsupported = parts.some(
    part => part !== 'row' && part !== 'column' && part !== 'dense',
  );

  if (
    unsupported ||
    parts.length > 2 ||
    parts.filter(part => part === 'row' || part === 'column').length > 1
  ) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.gridAutoFlow = hasDense ? `${direction} dense` : direction;
}

function parseGridTrack(value: string): GridTrack | undefined {
  const minMax = parseGridMinMax(value);

  if (minMax) {
    return minMax;
  }

  const fraction = parseGridFraction(value);

  if (fraction !== undefined) {
    return fraction;
  }

  const length = parseNonNegativeDimension(value);

  if (length !== undefined && typeof length !== 'object') {
    return length;
  }

  return undefined;
}

function parseGridMinMax(
  value: string,
): { min: GridMinTrackBreadth; max: GridMaxTrackBreadth } | undefined {
  const match = /^minmax\(\s*(.*)\s*,\s*(.*)\s*\)$/.exec(value);

  if (!match) {
    return undefined;
  }

  const min = parseGridMinTrackBreadth(match[1]?.trim() ?? '');
  const max = parseGridMaxTrackBreadth(match[2]?.trim() ?? '');

  return min === undefined || max === undefined ? undefined : { min, max };
}

function parseGridMinTrackBreadth(
  value: string,
): GridMinTrackBreadth | undefined {
  if (value === 'auto' || value === 'min-content' || value === 'max-content') {
    return value;
  }

  return parseNonNegativeDimension(value) as GridMinTrackBreadth | undefined;
}

function parseGridMaxTrackBreadth(
  value: string,
): GridMaxTrackBreadth | undefined {
  const fraction = parseGridFraction(value);

  if (fraction !== undefined) {
    return fraction;
  }

  return parseGridMinTrackBreadth(value);
}

function parseGridTemplateTrack(value: string): GridTemplateTrack | undefined {
  const repeat = parseGridRepeat(value);

  if (repeat) {
    return repeat;
  }

  return parseGridTrack(value);
}

function parseGridRepeat(
  value: string,
): { repeat: number; tracks: GridTrack[] } | undefined {
  const match = /^repeat\(\s*(\d+)\s*,\s*(.*)\s*\)$/.exec(value);

  if (!match) {
    return undefined;
  }

  const count = Number(match[1]);
  const tracks = splitCssWhitespaceList(match[2] ?? '').map(parseGridTrack);

  if (
    !Number.isInteger(count) ||
    count <= 0 ||
    tracks.length === 0 ||
    tracks.some(track => track === undefined)
  ) {
    return undefined;
  }

  return { repeat: count, tracks: tracks as GridTrack[] };
}

function parseGridFraction(value: string): `${number}fr` | undefined {
  if (!value.endsWith('fr')) {
    return undefined;
  }

  const number = parsePositiveNumber(value.slice(0, -2));
  return number === undefined ? undefined : `${number}fr`;
}

function parseAspectRatio(value: string): number | undefined {
  const parts = value
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length < 1 || parts.length > 2) {
    return undefined;
  }

  const numerator = parsePositiveNumber(parts[0] ?? '');
  const denominator =
    parts.length === 2 ? parsePositiveNumber(parts[1] ?? '') : 1;

  if (numerator === undefined || denominator === undefined) {
    return undefined;
  }

  return numerator / denominator;
}

function parseFlexShorthand(
  parts: string[],
):
  | { grow: number; shrink: number; basis: SupportedDimension | undefined }
  | undefined {
  if (parts.length < 1 || parts.length > 3) {
    return undefined;
  }

  if (parts.length === 1) {
    const number = parseNonNegativeNumber(parts[0] ?? '');

    if (number !== undefined) {
      return { grow: number, shrink: 1, basis: 0 };
    }

    const basis = parseFlexBasisValue(parts[0] ?? '');
    return basis !== null ? { grow: 1, shrink: 1, basis } : undefined;
  }

  const grow = parseNonNegativeNumber(parts[0] ?? '');

  if (grow === undefined) {
    return undefined;
  }

  if (parts.length === 2) {
    const shrink = parseNonNegativeNumber(parts[1] ?? '');

    if (shrink !== undefined) {
      return { grow, shrink, basis: 0 };
    }

    const basis = parseFlexBasisValue(parts[1] ?? '');
    return basis !== null ? { grow, shrink: 1, basis } : undefined;
  }

  const shrink = parseNonNegativeNumber(parts[1] ?? '');
  const basis = parseFlexBasisValue(parts[2] ?? '');

  if (shrink === undefined || basis === null) {
    return undefined;
  }

  return { grow, shrink, basis };
}

function parseFlexBasisValue(
  value: string,
): SupportedDimension | undefined | null {
  if (value === 'auto') {
    return undefined;
  }

  const length = parseNonNegativeDimension(value);
  return length === undefined ? null : length;
}

function applyInset(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const lengths = parts.map(part => parseInsetLength(part, context));

  if (lengths.some(length => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const [top, right = top, bottom = top, left = right] = lengths as Array<
    number | 'auto'
  >;

  setInsetSide(style, 'top', top);
  setInsetSide(style, 'right', right);
  setInsetSide(style, 'bottom', bottom);
  setInsetSide(style, 'left', left);
}

function applyLogicalInset(
  style: SupportedStyle,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const start = parseInsetLength(parts[0] ?? '', context);
  const end = parseInsetLength(parts[1] ?? parts[0] ?? '', context);

  if (start === undefined || end === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  if (axis === 'inline') {
    setInsetSide(style, 'left', start);
    setInsetSide(style, 'right', end);
    return;
  }

  setInsetSide(style, 'top', start);
  setInsetSide(style, 'bottom', end);
}

function applyGap(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const lengths = parts.map(part => parseGapLength(part, context));

  if (lengths.some(length => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const [rowGap, columnGap = rowGap] = lengths as SupportedDimension[];
  style.rowGap = rowGap;
  style.columnGap = columnGap;
}

function applyGapLength(
  style: SupportedStyle,
  key: 'rowGap' | 'columnGap',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const length = parseGapLength(value, context);

  if (length === undefined) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style[key] = length;
}

function parseInsetLength(
  value: string,
  context: DeclarationContext,
): SupportedDimension | 'auto' | undefined {
  if (value === 'auto') return 'auto';
  return parseDimension(value, context);
}

function setInsetSide(
  style: SupportedStyle,
  key: 'top' | 'right' | 'bottom' | 'left',
  value: SupportedDimension | 'auto',
): void {
  style[key] = value === 'auto' ? undefined : value;
}

function parseGapLength(
  value: string,
  context: DeclarationContext,
): SupportedDimension | undefined {
  if (value === 'normal') return 0;
  const length = parseDimension(value, context);
  return isNonNegativeDimension(length) ? length : undefined;
}

function parsePaddingLength(
  value: string,
  context: DeclarationContext,
): SupportedDimension | undefined {
  const length = parseDimension(value, context);
  return isNonNegativeDimension(length) ? length : undefined;
}

function parseMarginLength(
  value: string,
  context?: DeclarationContext,
): MarginValue | undefined {
  return value === 'auto' ? 'auto' : parseDimension(value, context);
}

function applyBorderStyles(
  styles: BorderStyles,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const [top, right = top, bottom = top, left = right] = parts;
  applyBorderStyle(styles, 'top', top, property, originalValue, context);
  applyBorderStyle(styles, 'right', right, property, originalValue, context);
  applyBorderStyle(styles, 'bottom', bottom, property, originalValue, context);
  applyBorderStyle(styles, 'left', left, property, originalValue, context);
}

function applyLogicalBorderStyles(
  styles: BorderStyles,
  axis: 'inline' | 'block',
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length < 1 || parts.length > 2) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const start = parts[0] ?? '';
  const end = parts[1] ?? start;

  if (axis === 'inline') {
    applyBorderStyle(styles, 'left', start, property, originalValue, context);
    applyBorderStyle(styles, 'right', end, property, originalValue, context);
    return;
  }

  applyBorderStyle(styles, 'top', start, property, originalValue, context);
  applyBorderStyle(styles, 'bottom', end, property, originalValue, context);
}

function applyBorderStyle(
  styles: BorderStyles,
  edge: keyof BorderStyles,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (isSupportedBorderStyle(value)) {
    styles[edge] = value;
    return;
  }

  handleUnsupportedCss(context.policy, {
    property,
    value: originalValue,
    reason: 'unsupported-value',
    source: context.source,
    selector: context.selector,
    element: context.element,
  });
}

function applyBorderShorthand(
  style: SupportedStyle,
  edge: keyof Edges | undefined,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  const parsed = parseBorderShorthand(value);

  if (!parsed) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  const edges: Array<keyof Edges> = edge
    ? [edge]
    : ['top', 'right', 'bottom', 'left'];

  for (const currentEdge of edges) {
    style.borderWidth[currentEdge] = parsed.width;
    style.borderStyle[currentEdge] = parsed.style;
  }
}

function parseBorderShorthand(
  value: string,
): { width: number; style: BorderStyleValue } | undefined {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return undefined;
  }

  let width: number | undefined;
  let style: BorderStyleValue | undefined;

  for (const part of parts) {
    const parsedWidth = parseBorderWidth(part);

    if (parsedWidth !== undefined) {
      if (width !== undefined) {
        return undefined;
      }

      width = parsedWidth;
      continue;
    }

    if (isSupportedBorderStyle(part)) {
      if (style !== undefined) {
        return undefined;
      }

      style = part;
      continue;
    }

    // Border color has no effect on layout or hit testing, so recognized color-like
    // tokens are accepted and intentionally discarded.
    if (!isBorderColorLikeToken(part)) {
      return undefined;
    }
  }

  return {
    width: width ?? 3,
    style: style ?? 'none',
  };
}

function parseBorderWidth(value: string): number | undefined {
  switch (value) {
    case 'thin':
      return 1;
    case 'medium':
      return 3;
    case 'thick':
      return 5;
    default:
      return parsePxLength(value);
  }
}

function isSupportedBorderStyle(value: string): value is BorderStyleValue {
  return [
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
  ].includes(value);
}

function isBorderColorLikeToken(value: string): boolean {
  return isVisualColorToken(value) && !cssWideKeywords.has(value);
}

const cssWideKeywords = new Set([
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'unset',
]);

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
]);

function applyZIndex(
  style: SupportedStyle,
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
): void {
  if (value === 'auto') {
    style.zIndex = 0;
    style.zIndexAuto = true;
    return;
  }

  const zIndex = parseNumberCalculation(value);

  if (zIndex === undefined || !Number.isInteger(zIndex)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return;
  }

  style.zIndex = zIndex;
  style.zIndexAuto = false;
}

function parsePxLength(value: string): number | undefined {
  if (value === '0') {
    return 0;
  }

  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
  return match ? Number(match[1]) : undefined;
}

function parseEmLength(value: string): number | undefined {
  const match = /^(-?\d+(?:\.\d+)?)em$/.exec(value);
  return match ? Number(match[1]) : undefined;
}

function parseRemLength(value: string): number | undefined {
  const match = /^(-?\d+(?:\.\d+)?)rem$/.exec(value);
  return match ? Number(match[1]) : undefined;
}

function parseDimension(
  value: string,
  context?: DeclarationContext,
): SupportedDimension | undefined {
  return parseLengthPercentage(value, context);
}

function parsePercentage(value: string): number | undefined {
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(value);
  return match ? Number(match[1]) : undefined;
}

function parseNonNegativeDimension(
  value: string,
): SupportedDimension | undefined {
  const length = parseDimension(value);

  return isNonNegativeDimension(length) ? length : undefined;
}

function isNonNegativeDimension(
  length: SupportedDimension | undefined,
): length is SupportedDimension {
  if (typeof length === 'number') {
    return length >= 0;
  }

  if (typeof length === 'string') {
    const percentage = parsePercentage(length);
    return percentage !== undefined && percentage >= 0;
  }

  return false;
}

function parseNonNegativeNumber(value: string): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function parsePositiveNumber(value: string): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseEdgeLengths<Value = number>(
  value: string,
  property: string,
  originalValue: string,
  context: DeclarationContext,
  parseLength: (value: string) => Value | undefined = parsePxLength as (
    value: string,
  ) => Value | undefined,
): Edges<Value> | undefined {
  const parts = splitCssComponents(value);

  if (parts.length < 1 || parts.length > 4) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return undefined;
  }

  const lengths = parts.map(parseLength);

  if (lengths.some(length => length === undefined)) {
    handleUnsupportedCss(context.policy, {
      property,
      value: originalValue,
      reason: 'unsupported-value',
      source: context.source,
      selector: context.selector,
      element: context.element,
    });
    return undefined;
  }

  const [top, right = top, bottom = top, left = right] = lengths as Value[];
  return { top, right, bottom, left };
}

function splitCssComponents(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;

  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;

    if ((character === undefined || /\s/.test(character)) && depth === 0) {
      const part = value.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }

  return parts;
}

function edgeNameFromProperty(property: string): keyof Edges {
  if (property.includes('-right-') || property.endsWith('-right')) {
    return 'right';
  }

  if (property.includes('-bottom-') || property.endsWith('-bottom')) {
    return 'bottom';
  }

  if (property.includes('-left-') || property.endsWith('-left')) {
    return 'left';
  }

  return 'top';
}
