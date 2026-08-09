import { describe, expect, it } from 'vitest'
import { resolveCustomPropertyValue } from '../../src/css-parity-implementation/css/custom-properties.ts'

describe('CSS custom property resolution', () => {
  it('resolves nested references and fallbacks while preserving case-sensitive names', () => {
    const properties = new Map([
      ['--Size', '40px'],
      ['--nested', 'var(--missing, var(--Size))'],
    ])

    expect(resolveCustomPropertyValue('calc(var(--nested) + 2px)', properties)).toBe('calc( 40px + 2px)')
    expect(resolveCustomPropertyValue('var(--size)', properties)).toBeUndefined()
  })

  it('invalidates cyclic properties but permits a fallback at the consuming declaration', () => {
    const properties = new Map([
      ['--a', 'var(--b, 10px)'],
      ['--b', 'var(--a)'],
    ])

    expect(resolveCustomPropertyValue('var(--a)', properties)).toBeUndefined()
    expect(resolveCustomPropertyValue('var(--a, 25px)', properties)).toBe(' 25px')
  })

  it('resolves references declared later in the custom property map', () => {
    const properties = new Map([
      ['--first', 'var(--second)'],
      ['--second', '18px'],
    ])

    expect(resolveCustomPropertyValue('var(--first)', properties)).toBe('18px')
  })

  it('rejects malformed and non-variable functions', () => {
    const properties = new Map([['--size', '18px']])

    expect(resolveCustomPropertyValue('var(--size', properties)).toBeUndefined()
    expect(resolveCustomPropertyValue('myvar(--size)', properties)).toBe('myvar(--size)')
  })
})
