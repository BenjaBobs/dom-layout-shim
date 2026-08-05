import type { Viewport } from '../layout-engine-config.ts'

type ViewportFeature = 'width' | 'height'

export function matchesViewportMediaQuery(query: string, viewport: Viewport): boolean {
  return splitAtTopLevel(query, ',').some((part) => matchesSingleQuery(part.trim(), viewport))
}

function matchesSingleQuery(query: string, viewport: Viewport): boolean {
  if (!query) {
    return false
  }

  let expression = query
  let negate = false
  const modifier = expression.match(/^(not|only)\s+/i)

  if (modifier) {
    negate = modifier[1]?.toLowerCase() === 'not'
    expression = expression.slice(modifier[0].length).trim()
  }

  const parts = splitAtTopLevelKeyword(expression, 'and')
  const firstPart = parts[0]?.trim() ?? ''
  const hasMediaType = firstPart !== '' && !firstPart.startsWith('(')
  const mediaTypeMatches = !hasMediaType || /^(all|screen)$/i.test(firstPart)
  const featureParts = hasMediaType ? parts.slice(1) : parts
  const featuresMatch =
    (hasMediaType || featureParts.length > 0) &&
    featureParts.every((part) => matchesFeature(part.trim(), viewport))
  const matches = mediaTypeMatches && featuresMatch

  return negate ? !matches : matches
}

function matchesFeature(expression: string, viewport: Viewport): boolean {
  if (!expression.startsWith('(') || !expression.endsWith(')')) {
    return false
  }

  const feature = expression.slice(1, -1).trim()
  const orientation = feature.match(/^orientation\s*:\s*(portrait|landscape)$/i)

  if (orientation) {
    const actual = viewport.width > viewport.height ? 'landscape' : 'portrait'
    return actual === orientation[1]?.toLowerCase()
  }

  const aspectRatio = feature.match(/^(min-|max-)?aspect-ratio\s*:\s*(\d+)\s*\/\s*(\d+)$/i)

  if (aspectRatio) {
    const denominator = Number(aspectRatio[3])

    if (denominator === 0) {
      return false
    }

    return compare(
      viewport.width / viewport.height,
      Number(aspectRatio[2]) / denominator,
      aspectRatio[1]?.toLowerCase(),
    )
  }

  const dimension = feature.match(/^(min-|max-)?(width|height)(?:\s*:\s*(.+))?$/i)

  if (dimension) {
    const actual = viewport[dimension[2]?.toLowerCase() as ViewportFeature]
    const value = dimension[3]

    if (value === undefined) {
      return actual > 0
    }

    const expected = parseLength(value)
    return expected !== undefined && compare(actual, expected, dimension[1]?.toLowerCase())
  }

  return matchesRangeFeature(feature, viewport)
}

function matchesRangeFeature(feature: string, viewport: Viewport): boolean {
  const featureFirst = feature.match(
    /^(width|height)\s*(<=|>=|<|>|=)\s*(.+)$/i,
  )

  if (featureFirst) {
    const actual = viewport[featureFirst[1]?.toLowerCase() as ViewportFeature]
    const expected = parseLength(featureFirst[3] ?? '')
    return expected !== undefined && compareOperator(actual, expected, featureFirst[2] ?? '')
  }

  const valueFirst = feature.match(
    /^(.+?)\s*(<=|>=|<|>|=)\s*(width|height)$/i,
  )

  if (!valueFirst) {
    return false
  }

  const expected = parseLength(valueFirst[1] ?? '')
  const actual = viewport[valueFirst[3]?.toLowerCase() as ViewportFeature]
  return expected !== undefined && compareOperator(expected, actual, valueFirst[2] ?? '')
}

function parseLength(value: string): number | undefined {
  const length = value.trim().match(/^([+-]?(?:\d+|\d*\.\d+))(px|em|rem)?$/i)

  if (!length) {
    return undefined
  }

  const numericValue = Number(length[1])
  const unit = length[2]?.toLowerCase() ?? ''

  if (numericValue < 0 || (unit === '' && numericValue !== 0)) {
    return undefined
  }

  return unit === 'em' || unit === 'rem' ? numericValue * 16 : numericValue
}

function compare(actual: number, expected: number, prefix: string | undefined): boolean {
  if (prefix === 'min-') {
    return actual >= expected
  }

  if (prefix === 'max-') {
    return actual <= expected
  }

  return actual === expected
}

function compareOperator(left: number, right: number, operator: string): boolean {
  switch (operator) {
    case '<':
      return left < right
    case '<=':
      return left <= right
    case '>':
      return left > right
    case '>=':
      return left >= right
    case '=':
      return left === right
    default:
      return false
  }
}

function splitAtTopLevel(value: string, delimiter: string): string[] {
  const parts = []
  let depth = 0
  let start = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
    } else if (character === delimiter && depth === 0) {
      parts.push(value.slice(start, index))
      start = index + 1
    }

    if (depth < 0) {
      return []
    }
  }

  if (depth !== 0) {
    return []
  }

  parts.push(value.slice(start))
  return parts
}

function splitAtTopLevelKeyword(value: string, keyword: string): string[] {
  const parts = []
  let depth = 0
  let start = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (character === '(') {
      depth += 1
    } else if (character === ')') {
      depth -= 1
    } else if (
      depth === 0 &&
      value.slice(index, index + keyword.length).toLowerCase() === keyword &&
      /\s/.test(value[index - 1] ?? '') &&
      /\s/.test(value[index + keyword.length] ?? '')
    ) {
      parts.push(value.slice(start, index))
      start = index + keyword.length
      index += keyword.length - 1
    }
  }

  parts.push(value.slice(start))
  return parts
}
