import type { Viewport } from '../../api/layout-engine-config.ts'
import type { CalculatedDimension, SupportedDimension } from './supported-style.ts'

export type LengthContext = {
  fontSize?: number
  rootFontSize?: number
  viewport?: Viewport
}

type Quantity = {
  number: number
  px: number
  percent: number
}

export function parseLengthPercentage(
  value: string,
  context: LengthContext = {},
): SupportedDimension | undefined {
  const parser = new CalculationParser(value, context)
  const quantity = parser.parse()

  if (!quantity || quantity.number !== 0) return undefined
  if (quantity.percent !== 0 && quantity.px !== 0) {
    return { percentage: quantity.percent, length: quantity.px }
  }
  if (quantity.percent !== 0) return `${quantity.percent}%`
  return quantity.px
}

export function parseNumberCalculation(value: string): number | undefined {
  const quantity = new CalculationParser(value, {}).parse()
  return quantity && quantity.px === 0 && quantity.percent === 0 ? quantity.number : undefined
}

class CalculationParser {
  private index = 0
  private readonly input: string
  private readonly context: LengthContext

  constructor(input: string, context: LengthContext) {
    this.input = input
    this.context = context
  }

  parse(): Quantity | undefined {
    const value = this.expression()
    this.space()
    return value && this.index === this.input.length ? value : undefined
  }

  private expression(): Quantity | undefined {
    let left = this.product()
    if (!left) return undefined

    while (true) {
      this.space()
      const operator = this.input[this.index]
      if (operator !== '+' && operator !== '-') break
      this.index += 1
      const right = this.product()
      if (!right) return undefined
      left = add(left, right, operator === '+' ? 1 : -1)
      if (!left) return undefined
    }
    return left
  }

  private product(): Quantity | undefined {
    let left = this.primary()
    if (!left) return undefined

    while (true) {
      this.space()
      const operator = this.input[this.index]
      if (operator !== '*' && operator !== '/') break
      this.index += 1
      const right = this.primary()
      if (!right) return undefined
      left = multiply(left, right, operator)
      if (!left) return undefined
    }
    return left
  }

  private primary(): Quantity | undefined {
    this.space()

    if (this.input.slice(this.index, this.index + 5).toLowerCase() === 'calc(') {
      this.index += 5
      const value = this.expression()
      return value && this.closeParenthesis() ? value : undefined
    }

    if (this.input[this.index] === '(') {
      this.index += 1
      const value = this.expression()
      return value && this.closeParenthesis() ? value : undefined
    }

    const match = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[a-z]+|%)?/i.exec(this.input.slice(this.index))
    if (!match) return undefined
    this.index += match[0].length
    return quantity(match[0], this.context)
  }

  private closeParenthesis(): boolean {
    this.space()
    if (this.input[this.index] !== ')') return false
    this.index += 1
    return true
  }

  private space(): void {
    while (/\s/.test(this.input[this.index] ?? '')) this.index += 1
  }
}

function quantity(token: string, context: LengthContext): Quantity | undefined {
  const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))([a-z]+|%)?$/i.exec(token)
  if (!match) return undefined
  const value = Number(match[1])
  const unit = (match[2] ?? '').toLowerCase()

  switch (unit) {
    case '': return scalar(value)
    case 'px': return pixels(value)
    case '%': return percentage(value)
    case 'em': return context.fontSize === undefined ? undefined : pixels(value * context.fontSize)
    case 'rem': return context.rootFontSize === undefined ? undefined : pixels(value * context.rootFontSize)
    case 'vw': return context.viewport === undefined ? undefined : pixels(value * context.viewport.width / 100)
    case 'vh': return context.viewport === undefined ? undefined : pixels(value * context.viewport.height / 100)
    case 'vmin': return context.viewport === undefined ? undefined : pixels(value * Math.min(context.viewport.width, context.viewport.height) / 100)
    case 'vmax': return context.viewport === undefined ? undefined : pixels(value * Math.max(context.viewport.width, context.viewport.height) / 100)
    default: return undefined
  }
}

function add(left: Quantity, right: Quantity, sign: 1 | -1): Quantity | undefined {
  const number = left.number + sign * right.number
  const px = left.px + sign * right.px
  const percent = left.percent + sign * right.percent
  if (number !== 0 && (px !== 0 || percent !== 0)) return undefined
  return { number, px, percent }
}

function multiply(left: Quantity, right: Quantity, operator: '*' | '/'): Quantity | undefined {
  if (operator === '/') {
    if (!isScalar(right) || right.number === 0) return undefined
    return scale(left, 1 / right.number)
  }

  if (isScalar(left)) return scale(right, left.number)
  if (isScalar(right)) return scale(left, right.number)
  return undefined
}

function scalar(number: number): Quantity {
  return { number, px: 0, percent: 0 }
}

function pixels(px: number): Quantity {
  return { number: 0, px, percent: 0 }
}

function percentage(percent: number): Quantity {
  return { number: 0, px: 0, percent }
}

function isScalar(value: Quantity): boolean {
  return value.px === 0 && value.percent === 0
}

function scale(value: Quantity, multiplier: number): Quantity {
  return {
    number: value.number * multiplier,
    px: value.px * multiplier,
    percent: value.percent * multiplier,
  }
}

export function resolveCalculatedDimension(value: SupportedDimension, basis: number | undefined): number | `${number}%` | undefined {
  if (!isCalculatedDimension(value)) return value
  return basis === undefined ? undefined : basis * value.percentage / 100 + value.length
}

export function isCalculatedDimension(value: SupportedDimension): value is CalculatedDimension {
  return typeof value === 'object'
}
