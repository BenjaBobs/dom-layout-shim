export function readDeclaration(declaration: unknown): { property: string; value: string } {
  if (!isDeclaration(declaration)) {
    return {
      property: 'unknown',
      value: JSON.stringify(declaration),
    }
  }

  if (declaration.property === 'custom') {
    const custom = declaration.value as { name?: string; value?: unknown[] }

    return {
      property: custom.name ?? 'custom',
      value: stringifyTokens(custom.value ?? []),
    }
  }

  if (declaration.property === 'unparsed' && isRecord(declaration.value)) {
    const propertyId = declaration.value.propertyId

    if (isRecord(propertyId) && typeof propertyId.property === 'string' && Array.isArray(declaration.value.value)) {
      return {
        property: propertyId.property,
        value: stringifyTokens(declaration.value.value),
      }
    }
  }

  return {
    property: declaration.property,
    value: stringifyCssValue(declaration.property, declaration.value),
  }
}

function stringifyCssValue(property: string, value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (!isRecord(value)) {
    return String(value)
  }

  switch (property) {
    case 'display':
      return stringifyDisplay(value)
    case 'align-content':
    case 'align-items':
    case 'align-self':
    case 'justify-content':
    case 'justify-items':
    case 'justify-self':
      return stringifyAlignment(value)
    case 'place-content':
      return stringifyPlaceAlignment(value, stringifyAlignment)
    case 'place-items':
    case 'place-self':
      return stringifyPlaceAlignment(value, stringifyAlignment)
    case 'position':
      return typeof value.type === 'string' ? value.type : JSON.stringify(value)
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
    case 'width':
    case 'height':
    case 'inline-size':
    case 'block-size':
    case 'min-width':
    case 'min-height':
    case 'min-inline-size':
    case 'min-block-size':
    case 'max-width':
    case 'max-height':
    case 'max-inline-size':
    case 'max-block-size':
    case 'font-size':
    case 'line-height':
    case 'flex-grow':
    case 'flex-shrink':
    case 'flex-basis':
      return stringifyLengthLike(value)
    case 'flex':
      return stringifyFlex(value)
    case 'flex-flow':
      return stringifyFlexFlow(value)
    case 'aspect-ratio':
      return stringifyAspectRatio(value)
    case 'grid-template-columns':
    case 'grid-template-rows':
      return stringifyGridTemplate(value)
    case 'grid-auto-columns':
    case 'grid-auto-rows':
      return stringifyGridAutoTracks(value)
    case 'grid-auto-flow':
      return stringifyGridAutoFlow(value)
    case 'grid-column':
    case 'grid-row':
      return stringifyGridLine(value)
    case 'grid-column-start':
    case 'grid-column-end':
    case 'grid-row-start':
    case 'grid-row-end':
      return stringifyGridPlacement(value)
    case 'inset':
      return stringifyInset(value)
    case 'inset-inline':
      return stringifyLogicalPair(value, 'inlineStart', 'inlineEnd')
    case 'inset-block':
      return stringifyLogicalPair(value, 'blockStart', 'blockEnd')
    case 'overflow':
      return stringifyOverflow(value)
    case 'gap':
      return stringifyGap(value)
    case 'padding':
    case 'margin':
    case 'border-width':
    case 'border-style':
      return stringifyEdges(value, property)
    case 'padding-inline':
    case 'margin-inline':
      return stringifyLogicalPair(value, 'inlineStart', 'inlineEnd')
    case 'padding-block':
    case 'margin-block':
      return stringifyLogicalPair(value, 'blockStart', 'blockEnd')
    case 'border-inline-width':
    case 'border-inline-style':
    case 'border-inline-color':
      return stringifyLogicalPair(value, 'start', 'end')
    case 'border-block-width':
    case 'border-block-style':
    case 'border-block-color':
      return stringifyLogicalPair(value, 'start', 'end')
    case 'border':
    case 'border-top':
    case 'border-right':
    case 'border-bottom':
    case 'border-left':
      return stringifyBorder(value)
    case 'outline':
      return stringifyOutline(value)
    case 'border-radius':
      return stringifyBorderRadius(value)
    case 'border-top-left-radius':
    case 'border-top-right-radius':
    case 'border-bottom-right-radius':
    case 'border-bottom-left-radius':
      return stringifyRadiusPair(value)
    case 'text-decoration':
      return stringifyTextDecoration(value)
    case 'filter':
    case 'backdrop-filter':
      return stringifyFilter(value)
    case 'transform-origin':
      return stringifyTransformOrigin(value)
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
    case 'row-gap':
    case 'column-gap':
    case 'border-top-width':
    case 'border-right-width':
    case 'border-bottom-width':
    case 'border-left-width':
    case 'outline-width':
    case 'outline-offset':
    case 'padding-inline-start':
    case 'padding-inline-end':
    case 'padding-block-start':
    case 'padding-block-end':
    case 'margin-inline-start':
    case 'margin-inline-end':
    case 'margin-block-start':
    case 'margin-block-end':
    case 'inset-inline-start':
    case 'inset-inline-end':
    case 'inset-block-start':
    case 'inset-block-end':
    case 'border-inline-start-width':
    case 'border-inline-end-width':
    case 'border-block-start-width':
    case 'border-block-end-width':
      return stringifyLengthLike(value)
    case 'outline-style':
    case 'border-inline-start-style':
    case 'border-inline-end-style':
    case 'border-block-start-style':
    case 'border-block-end-style':
      return stringifyLineStyle(value)
    case 'text-decoration-style':
      return typeof value === 'string' ? value : JSON.stringify(value)
    case 'text-decoration-line':
      return Array.isArray(value) ? value.join(' ') : String(value)
    case 'text-decoration-thickness':
      return stringifyLengthLike(value)
    case 'overflow-x':
    case 'overflow-y':
      return typeof value === 'string' ? value : JSON.stringify(value)
    case 'z-index':
      return stringifyZIndex(value)
    case 'accent-color':
    case 'caret-color':
      return stringifyAutoOrColor(value)
    case 'color':
    case 'background-color':
    case 'border-top-color':
    case 'border-right-color':
    case 'border-bottom-color':
    case 'border-left-color':
    case 'border-inline-start-color':
    case 'border-inline-end-color':
    case 'border-block-start-color':
    case 'border-block-end-color':
    case 'outline-color':
    case 'text-decoration-color':
      return stringifyColor(value)
    case 'background':
      return stringifyBackground(value)
    case 'background-image':
      return stringifyBackgroundImage(value)
    case 'background-repeat':
      return stringifyBackgroundRepeat(value)
    case 'background-position':
      return stringifyBackgroundPosition(value)
    case 'background-size':
      return stringifyBackgroundSize(value)
    case 'background-origin':
    case 'background-clip':
    case 'background-attachment':
      return stringifyStringList(value)
    case 'box-shadow':
      return stringifyBoxShadow(value)
    case 'border-color':
      return stringifyColorEdges(value)
    case 'cursor':
      return stringifyCursor(value)
    case 'list-style':
      return stringifyListStyle(value)
    case 'list-style-type':
      return stringifyListStyleType(value)
    case 'list-style-image':
      return stringifyListStyleImage(value)
    case 'color-scheme':
      return stringifyColorScheme(value)
    case 'font-family':
      return Array.isArray(value) ? value.join(', ') : JSON.stringify(value)
    case 'white-space':
      return typeof value === 'string' ? value : JSON.stringify(value)
    default:
      return JSON.stringify(value)
  }
}

function stringifyDisplay(value: Record<string, unknown>): string {
  if (value.type === 'keyword') {
    return String(value.value)
  }

  if (value.type === 'pair') {
    const inside = value.inside

    if (value.isListItem === true) {
      return 'list-item'
    }

    if (isRecord(inside) && typeof inside.type === 'string' && inside.type !== 'flow') {
      if (inside.type === 'flow-root') {
        return value.outside === 'inline' ? 'inline-block' : 'flow-root'
      }

      if (value.outside === 'inline' && (inside.type === 'flex' || inside.type === 'grid')) {
        return `inline-${inside.type}`
      }

      return inside.type
    }

    return String(value.outside)
  }

  return JSON.stringify(value)
}

function stringifyAlignment(value: Record<string, unknown>): string {
  if (typeof value.value === 'string') {
    return value.value
  }

  if (typeof value.type === 'string') {
    return value.type
  }

  return JSON.stringify(value)
}

function stringifyPlaceAlignment(
  value: Record<string, unknown>,
  stringifyPart: (value: Record<string, unknown>) => string,
): string {
  const align = isRecord(value.align) ? stringifyPart(value.align) : JSON.stringify(value.align)
  const justify = isRecord(value.justify) ? stringifyPart(value.justify) : JSON.stringify(value.justify)

  return align === justify ? align : `${align} ${justify}`
}

function stringifyFlex(value: Record<string, unknown>): string {
  const grow = typeof value.grow === 'number' ? String(value.grow) : JSON.stringify(value.grow)
  const shrink = typeof value.shrink === 'number' ? String(value.shrink) : JSON.stringify(value.shrink)
  const basis = isRecord(value.basis) ? stringifyLengthLike(value.basis) : JSON.stringify(value.basis)

  return `${grow} ${shrink} ${basis}`
}

function stringifyFlexFlow(value: Record<string, unknown>): string {
  const direction = typeof value.direction === 'string' ? value.direction : JSON.stringify(value.direction)
  const wrap = typeof value.wrap === 'string' ? value.wrap : JSON.stringify(value.wrap)

  return `${direction} ${wrap}`
}

function stringifyAspectRatio(value: Record<string, unknown>): string {
  if (value.auto === true && value.ratio === null) {
    return 'auto'
  }

  if (!Array.isArray(value.ratio)) {
    return JSON.stringify(value)
  }

  const [numerator, denominator] = value.ratio

  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    return JSON.stringify(value)
  }

  return denominator === 1 ? String(numerator) : `${numerator} / ${denominator}`
}

function stringifyGridTemplate(value: Record<string, unknown>): string {
  if (value.type === 'none') {
    return 'none'
  }

  if (value.type !== 'track-list' || !Array.isArray(value.items)) {
    return JSON.stringify(value)
  }

  return value.items.map(stringifyGridTemplateItem).join(' ')
}

function stringifyGridTemplateItem(item: unknown): string {
  if (!isRecord(item)) {
    return JSON.stringify(item)
  }

  if (item.type === 'track-repeat' && isRecord(item.value)) {
    return stringifyGridTrackRepeat(item.value)
  }

  if (item.type !== 'track-size' || !isRecord(item.value)) {
    return JSON.stringify(item)
  }

  const trackSize = item.value

  if (trackSize.type === 'min-max') {
    return stringifyGridMinMax(trackSize)
  }

  if (trackSize.type === 'track-breadth' && isRecord(trackSize.value)) {
    return stringifyGridTrackBreadth(trackSize.value)
  }

  return JSON.stringify(item)
}

function stringifyGridTrackRepeat(value: Record<string, unknown>): string {
  const count = isRecord(value.count) && value.count.type === 'number' && typeof value.count.value === 'number'
    ? value.count.value
    : undefined

  if (count === undefined || !Array.isArray(value.trackSizes)) {
    return JSON.stringify(value)
  }

  const tracks = value.trackSizes.map((track) => {
    return isRecord(track) ? stringifyGridTrackSize(track) : JSON.stringify(track)
  })

  return `repeat(${count}, ${tracks.join(' ')})`
}

function stringifyGridTrackSize(value: Record<string, unknown>): string {
  if (value.type === 'min-max') {
    return stringifyGridMinMax(value)
  }

  return stringifyGridTrackBreadth(value)
}

function stringifyGridTrackBreadth(value: Record<string, unknown>): string {
  if (value.type === 'track-breadth' && isRecord(value.value)) {
    return stringifyGridTrackBreadth(value.value)
  }

  if (value.type === 'auto' || value.type === 'min-content' || value.type === 'max-content') {
    return value.type
  }

  if (value.type === 'flex' && typeof value.value === 'number') {
    return `${value.value}fr`
  }

  if (value.type === 'length') {
    return stringifyDimensionPercentage(value.value)
  }

  return JSON.stringify(value)
}

function stringifyGridMinMax(value: Record<string, unknown>): string {
  if (!isRecord(value.min) || !isRecord(value.max)) {
    return JSON.stringify(value)
  }

  return `minmax(${stringifyGridTrackBreadth(value.min)}, ${stringifyGridTrackBreadth(value.max)})`
}

function stringifyGridAutoTracks(value: unknown): string {
  if (!Array.isArray(value)) {
    return isRecord(value) ? stringifyGridTrackBreadth(value) : JSON.stringify(value)
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      return JSON.stringify(item)
    }

    return stringifyGridTrackSize(item)
  }).join(' ')
}

function stringifyGridLine(value: Record<string, unknown>): string {
  const start = stringifyGridPlacement(value.start)
  const end = stringifyGridPlacement(value.end)

  return end === 'auto' ? start : `${start} / ${end}`
}

function stringifyGridPlacement(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'line' && typeof value.index === 'number' && value.name === null) {
    return String(value.index)
  }

  if (value.type === 'span' && typeof value.index === 'number' && value.name === null) {
    return `span ${value.index}`
  }

  return JSON.stringify(value)
}

function stringifyGridAutoFlow(value: Record<string, unknown>): string {
  const parts = []

  if (value.direction === 'column') {
    parts.push('column')
  } else {
    parts.push('row')
  }

  if (value.dense === true) {
    parts.push('dense')
  }

  return parts.join(' ')
}

function stringifyLengthLike(value: Record<string, unknown>): string {
  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'none' || value.type === 'normal') {
    return value.type
  }

  if (value.type === 'thin' || value.type === 'medium' || value.type === 'thick') {
    return value.type
  }

  if (value.type === 'length-percentage') {
    return stringifyDimensionPercentage(value.value)
  }

  if (value.type === 'length') {
    return stringifyLength(value.value)
  }

  if (value.type === 'number' && typeof value.value === 'number') {
    return String(value.value)
  }

  return JSON.stringify(value)
}

function stringifyDimensionPercentage(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'percentage' && typeof value.value === 'number') {
    return `${value.value * 100}%`
  }

  if (value.type === 'dimension' && isRecord(value.value)) {
    const length = value.value

    if (length.unit === 'px' && typeof length.value === 'number') {
      return `${length.value}px`
    }

    return `${String(length.value)}${String(length.unit)}`
  }

  return JSON.stringify(value)
}

function stringifyLength(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'dimension' && isRecord(value.value)) {
    const length = value.value

    if (length.unit === 'px' && typeof length.value === 'number') {
      return `${length.value}px`
    }

    return `${String(length.value)}${String(length.unit)}`
  }

  if (value.type === 'value' && isRecord(value.value)) {
    const length = value.value

    if (length.unit === 'px' && typeof length.value === 'number') {
      return `${length.value}px`
    }

    return `${String(length.value)}${String(length.unit)}`
  }

  return JSON.stringify(value)
}

function stringifyEdges(value: Record<string, unknown>, property: string): string {
  const sides = [value.top, value.right, value.bottom, value.left].map((side) => {
    if (typeof side === 'string') {
      return side
    }

    return isRecord(side) ? stringifyLengthLike(side) : JSON.stringify(side)
  })

  if (sides.every((side) => side === sides[0])) {
    return sides[0]
  }

  if (sides[0] === sides[2] && sides[1] === sides[3]) {
    return `${sides[0]} ${sides[1]}`
  }

  if (sides[1] === sides[3]) {
    return `${sides[0]} ${sides[1]} ${sides[2]}`
  }

  return property === 'border-style' ? sides.join(' ') : sides.join(' ')
}

function stringifyLogicalPair(value: Record<string, unknown>, startKey: string, endKey: string): string {
  const startValue = stringifyLogicalSide(value[startKey])
  const endValue = stringifyLogicalSide(value[endKey])

  return startValue === endValue ? startValue : `${startValue} ${endValue}`
}

function stringifyLogicalSide(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (value.type === 'rgb' || value.type === 'currentcolor' || value.type === 'color') {
    return stringifyColor(value)
  }

  return stringifyLengthLike(value)
}

function stringifyBorder(value: Record<string, unknown>): string {
  const parts = []

  if (isRecord(value.width)) {
    parts.push(stringifyLengthLike(value.width))
  }

  if (typeof value.style === 'string') {
    parts.push(value.style)
  }

  return parts.length > 0 ? parts.join(' ') : JSON.stringify(value)
}

function stringifyOutline(value: Record<string, unknown>): string {
  const parts = []

  if (isRecord(value.width)) {
    parts.push(stringifyLengthLike(value.width))
  }

  if (isRecord(value.style)) {
    parts.push(stringifyLineStyle(value.style))
  }

  if (isRecord(value.color)) {
    parts.push(stringifyColor(value.color))
  }

  return parts.length > 0 ? parts.join(' ') : JSON.stringify(value)
}

function stringifyBorderRadius(value: Record<string, unknown>): string {
  const corners = [value.topLeft, value.topRight, value.bottomRight, value.bottomLeft].map((corner) => {
    return Array.isArray(corner) ? stringifyRadiusPair(corner) : JSON.stringify(corner)
  })

  if (corners.every((corner) => corner === corners[0])) {
    return corners[0]
  }

  if (corners[0] === corners[2] && corners[1] === corners[3]) {
    return `${corners[0]} ${corners[1]}`
  }

  if (corners[1] === corners[3]) {
    return `${corners[0]} ${corners[1]} ${corners[2]}`
  }

  return corners.join(' ')
}

function stringifyRadiusPair(value: unknown): string {
  if (!Array.isArray(value)) {
    return JSON.stringify(value)
  }

  const [first, second = first] = value
  const firstValue = isRecord(first) ? stringifyRadiusLength(first) : JSON.stringify(first)
  const secondValue = isRecord(second) ? stringifyRadiusLength(second) : JSON.stringify(second)

  return firstValue === secondValue ? firstValue : `${firstValue} ${secondValue}`
}

function stringifyRadiusLength(value: Record<string, unknown>): string {
  if (value.type === 'percentage' && typeof value.value === 'number') {
    return `${value.value * 100}%`
  }

  return stringifyLength(value)
}

function stringifyTextDecoration(value: Record<string, unknown>): string {
  const parts = []

  if (Array.isArray(value.line)) {
    parts.push(value.line.join(' '))
  } else if (typeof value.line === 'string') {
    parts.push(value.line)
  }

  if (typeof value.style === 'string' && value.style !== 'solid') {
    parts.push(value.style)
  }

  if (isRecord(value.color)) {
    const color = stringifyColor(value.color)

    if (color !== 'currentcolor') {
      parts.push(color)
    }
  }

  if (isRecord(value.thickness)) {
    const thickness = stringifyLengthLike(value.thickness)

    if (thickness !== 'auto') {
      parts.push(thickness)
    }
  }

  return parts.length > 0 ? parts.join(' ') : JSON.stringify(value)
}

function stringifyFilter(value: Record<string, unknown>): string {
  if (value.type === 'none') {
    return 'none'
  }

  if (value.type === 'filters' && Array.isArray(value.value)) {
    return value.value.map(stringifyFilterFunction).join(' ')
  }

  return JSON.stringify(value)
}

function stringifyFilterFunction(value: unknown): string {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return JSON.stringify(value)
  }

  if (isRecord(value.value)) {
    return `${value.type}(${stringifyLength(value.value)})`
  }

  if (typeof value.value === 'number') {
    return `${value.type}(${value.value})`
  }

  return `${value.type}()`
}

function stringifyTransformOrigin(value: Record<string, unknown>): string {
  const parts = [value.x, value.y, value.z]
    .filter((part) => part !== undefined)
    .map(stringifyTransformOriginPart)

  return parts.length > 0 ? parts.join(' ') : JSON.stringify(value)
}

function stringifyTransformOriginPart(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value)
  }

  if (typeof value.type === 'string' && ['center', 'length', 'percentage'].includes(value.type)) {
    if (value.type === 'center') {
      return 'center'
    }

    return stringifyLengthLike(value)
  }

  if (value.type === 'side' && typeof value.side === 'string') {
    const offset = isRecord(value.offset) ? ` ${stringifyLengthLike(value.offset)}` : ''
    return `${value.side}${offset}`
  }

  return JSON.stringify(value)
}

function stringifyLineStyle(value: Record<string, unknown>): string {
  if (typeof value.value === 'string') {
    return value.value
  }

  if (typeof value.type === 'string') {
    return value.type
  }

  return JSON.stringify(value)
}

function stringifyColor(value: Record<string, unknown>): string {
  if (value.type === 'currentcolor') {
    return 'currentcolor'
  }

  if (
    value.type === 'rgb' &&
    typeof value.r === 'number' &&
    typeof value.g === 'number' &&
    typeof value.b === 'number'
  ) {
    if (typeof value.alpha === 'number' && value.alpha !== 1) {
      return `rgba(${value.r},${value.g},${value.b},${value.alpha})`
    }

    return `rgb(${value.r},${value.g},${value.b})`
  }

  return JSON.stringify(value)
}

function stringifyColorEdges(value: Record<string, unknown>): string {
  const sides = [value.top, value.right, value.bottom, value.left].map((side) => {
    return isRecord(side) ? stringifyColor(side) : JSON.stringify(side)
  })

  if (sides.every((side) => side === sides[0])) {
    return sides[0]
  }

  if (sides[0] === sides[2] && sides[1] === sides[3]) {
    return `${sides[0]} ${sides[1]}`
  }

  if (sides[1] === sides[3]) {
    return `${sides[0]} ${sides[1]} ${sides[2]}`
  }

  return sides.join(' ')
}

function stringifyBackground(value: unknown): string {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    return JSON.stringify(value)
  }

  const layer = value[0]

  if (isRecord(layer.image) && layer.image.type !== 'none') {
    return JSON.stringify(value)
  }

  return isRecord(layer.color) ? stringifyColor(layer.color) : JSON.stringify(value)
}

function stringifyBackgroundImage(value: unknown): string {
  if (!Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return value.map((layer) => {
    if (isRecord(layer) && layer.type === 'none') {
      return 'none'
    }

    return JSON.stringify(layer)
  }).join(', ')
}

function stringifyBackgroundRepeat(value: unknown): string {
  if (!Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return value.map((layer) => {
    if (!isRecord(layer)) {
      return JSON.stringify(layer)
    }

    const x = typeof layer.x === 'string' ? layer.x : JSON.stringify(layer.x)
    const y = typeof layer.y === 'string' ? layer.y : JSON.stringify(layer.y)
    return x === y ? x : `${x} ${y}`
  }).join(', ')
}

function stringifyBackgroundPosition(value: unknown): string {
  if (!Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return value.map((layer) => {
    if (!isRecord(layer)) {
      return JSON.stringify(layer)
    }

    return [layer.x, layer.y]
      .filter((part) => part !== undefined)
      .map(stringifyTransformOriginPart)
      .join(' ')
  }).join(', ')
}

function stringifyBackgroundSize(value: unknown): string {
  if (!Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return value.map((layer) => {
    if (!isRecord(layer)) {
      return JSON.stringify(layer)
    }

    if (layer.type === 'cover' || layer.type === 'contain') {
      return layer.type
    }

    if (layer.type === 'explicit') {
      const width = isRecord(layer.width) ? stringifyLengthLike(layer.width) : JSON.stringify(layer.width)
      const height = isRecord(layer.height) ? stringifyLengthLike(layer.height) : JSON.stringify(layer.height)
      return width === height ? width : `${width} ${height}`
    }

    return JSON.stringify(layer)
  }).join(', ')
}

function stringifyStringList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(String).join(', ')
  }

  return typeof value === 'string' ? value : JSON.stringify(value)
}

function stringifyBoxShadow(value: unknown): string {
  if (!Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return value.map((shadow) => {
    if (!isRecord(shadow)) {
      return JSON.stringify(shadow)
    }

    const parts = []

    if (shadow.inset === true) {
      parts.push('inset')
    }

    if (isRecord(shadow.xOffset)) {
      parts.push(stringifyLength(shadow.xOffset))
    }

    if (isRecord(shadow.yOffset)) {
      parts.push(stringifyLength(shadow.yOffset))
    }

    if (isRecord(shadow.blur)) {
      parts.push(stringifyLength(shadow.blur))
    }

    if (isRecord(shadow.spread)) {
      parts.push(stringifyLength(shadow.spread))
    }

    if (isRecord(shadow.color)) {
      parts.push(stringifyColor(shadow.color))
    }

    return parts.join(' ')
  }).join(', ')
}

function stringifyCursor(value: Record<string, unknown>): string {
  if (Array.isArray(value.images) && value.images.length === 0 && typeof value.keyword === 'string') {
    return value.keyword
  }

  return JSON.stringify(value)
}

function stringifyAutoOrColor(value: Record<string, unknown>): string {
  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'color' && isRecord(value.value)) {
    return stringifyColor(value.value)
  }

  return stringifyColor(value)
}

function stringifyListStyle(value: Record<string, unknown>): string {
  const parts = []

  if (typeof value.position === 'string' && value.position !== 'outside') {
    parts.push(value.position)
  }

  if (isRecord(value.image)) {
    const image = stringifyListStyleImage(value.image)

    if (image !== 'none') {
      parts.push(image)
    }
  }

  if (isRecord(value.listStyleType)) {
    parts.push(stringifyListStyleType(value.listStyleType))
  }

  return parts.length > 0 ? parts.join(' ') : JSON.stringify(value)
}

function stringifyListStyleType(value: Record<string, unknown>): string {
  if (typeof value.type === 'string') {
    return value.type
  }

  return JSON.stringify(value)
}

function stringifyListStyleImage(value: Record<string, unknown>): string {
  if (value.type === 'none') {
    return 'none'
  }

  return JSON.stringify(value)
}

function stringifyColorScheme(value: Record<string, unknown>): string {
  const parts = []

  if (value.only === true) {
    parts.push('only')
  }

  if (value.light === true) {
    parts.push('light')
  }

  if (value.dark === true) {
    parts.push('dark')
  }

  return parts.length > 0 ? parts.join(' ') : JSON.stringify(value)
}

function stringifyInset(value: Record<string, unknown>): string {
  const sides = [value.top, value.right, value.bottom, value.left].map(stringifyInsetSide)

  if (sides.every((side) => side === sides[0])) {
    return sides[0]
  }

  return sides.join(' ')
}

function stringifyOverflow(value: Record<string, unknown>): string {
  const x = typeof value.x === 'string' ? value.x : JSON.stringify(value.x)
  const y = typeof value.y === 'string' ? value.y : JSON.stringify(value.y)

  return x === y ? x : `${x} ${y}`
}

function stringifyInsetSide(value: unknown): string {
  return isRecord(value) ? stringifyLengthLike(value) : JSON.stringify(value)
}

function stringifyGap(value: Record<string, unknown>): string {
  const row = stringifyGapSide(value.row)
  const column = stringifyGapSide(value.column)

  return row === column ? row : `${row} ${column}`
}

function stringifyGapSide(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  return isRecord(value) ? stringifyLengthLike(value) : JSON.stringify(value)
}

function stringifyZIndex(value: Record<string, unknown>): string {
  if (value.type === 'auto') {
    return 'auto'
  }

  if (value.type === 'integer') {
    return String(value.value)
  }

  return JSON.stringify(value)
}

function stringifyTokens(tokens: unknown[]): string {
  return tokens.map(stringifyToken).join(' ')
}

function stringifyToken(token: unknown): string {
  if (!isRecord(token)) {
    return String(token)
  }

  if (token.type === 'token' && isRecord(token.value)) {
    const value = token.value

    if (value.type === 'comma') {
      return ','
    }

    if (value.type === 'white-space') {
      return ' '
    }

    if ('value' in value) {
      return String(value.value)
    }

    if (typeof value.type === 'string') {
      return value.type
    }
  }

  if (token.type === 'length' && isRecord(token.value)) {
    const value = token.value

    if (typeof value.value === 'number' && typeof value.unit === 'string') {
      return `${value.value}${value.unit}`
    }
  }

  return JSON.stringify(token)
}

function isDeclaration(value: unknown): value is { property: string; value: unknown } {
  return isRecord(value) && typeof value.property === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
