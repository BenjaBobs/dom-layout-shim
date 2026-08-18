import type { Viewport } from '../../api/layout-engine-config.ts'
import type { SupportedDimension } from './supported-style.ts'

export type LengthContext = {
  fontSize?: number
  rootFontSize?: number
  viewport?: Viewport
}

type Quantity = {
  value: number
  unit: 'number' | 'px' | 'percent'
}

export function parseLengthPercentage(
  value: string,
  context: LengthContext = {},
): SupportedDimension | undefined {
  const parser = new CalculationParser(value, context)
  const quantity = parser.parse()

  if (!quantity || (quantity.unit === 'number' && quantity.value !== 0)) return undefined
  if (quantity.unit === 'percent') return `${quantity.value}%`
  return quantity.value
}

export function parseNumberCalculation(value: string): number | undefined {
  const quantity = new CalculationParser(value, {}).parse()
  return quantity?.unit === 'number' ? quantity.value : undefined
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
    case '': return { value, unit: 'number' }
    case 'px': return { value, unit: 'px' }
    case '%': return { value, unit: 'percent' }
    case 'em': return context.fontSize === undefined ? undefined : { value: value * context.fontSize, unit: 'px' }
    case 'rem': return context.rootFontSize === undefined ? undefined : { value: value * context.rootFontSize, unit: 'px' }
    case 'vw': return context.viewport === undefined ? undefined : { value: value * context.viewport.width / 100, unit: 'px' }
    case 'vh': return context.viewport === undefined ? undefined : { value: value * context.viewport.height / 100, unit: 'px' }
    case 'vmin': return context.viewport === undefined ? undefined : { value: value * Math.min(context.viewport.width, context.viewport.height) / 100, unit: 'px' }
    case 'vmax': return context.viewport === undefined ? undefined : { value: value * Math.max(context.viewport.width, context.viewport.height) / 100, unit: 'px' }
    default: return undefined
  }
}

function add(left: Quantity, right: Quantity, sign: 1 | -1): Quantity | undefined {
  if (left.unit === 'number' && left.value === 0) return { value: sign * right.value, unit: right.unit }
  if (right.unit === 'number' && right.value === 0) return left
  if (left.unit !== right.unit) return undefined
  return { value: left.value + sign * right.value, unit: left.unit }
}

function multiply(left: Quantity, right: Quantity, operator: '*' | '/'): Quantity | undefined {
  if (operator === '/') {
    if (right.unit !== 'number' || right.value === 0) return undefined
    return { value: left.value / right.value, unit: left.unit }
  }

  if (left.unit === 'number') return { value: left.value * right.value, unit: right.unit }
  if (right.unit === 'number') return { value: left.value * right.value, unit: left.unit }
  return undefined
}
