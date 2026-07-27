import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cssSupportInventory, getInventoriedCssProperties, getInventoriedHtmlElements } from '../../src/index.ts'

describe('CSS support inventory', () => {
  it('tracks every declaration property handled by applyDeclaration', () => {
    const inventoried = new Set(getInventoriedCssProperties())
    const missing = handledDeclarationProperties().filter((property) => !inventoried.has(property))

    expect(missing).toEqual([])
  })

  it('references existing browser parity fixtures', () => {
    const missing = cssSupportInventory.flatMap((entry) =>
      entry.claims.flatMap((claim) => claim.parity.fixtures)
        .filter((fixture) => !existsSync(resolve('test/browser-parity/cases', `${fixture}.test.ts`)))
        .map((fixture) => `${entry.id}: ${fixture}`),
    )

    expect(missing).toEqual([])
  })

  it('tracks major HTML element layout categories', () => {
    const inventoried = new Set(getInventoriedHtmlElements())
    const expected = [
      'a',
      'base',
      'body',
      'button',
      'canvas',
      'div',
      'fieldset',
      'form',
      'h1',
      'html',
      'img',
      'input',
      'li',
      'link',
      'meta',
      'ol',
      'p',
      'select',
      'span',
      'script',
      'style',
      'svg',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'title',
      'tr',
      'ul',
      'template',
      'video',
    ]

    expect(expected.filter((element) => !inventoried.has(element))).toEqual([])
  })

  it('does not list the same implemented property in multiple active entries', () => {
    const activeProperties = cssSupportInventory
      .filter((entry) => entry.status !== 'unsupported')
      .flatMap((entry) => entry.subjects.properties.map((property) => ({ entry: entry.id, property })))
      .filter(({ property }) => !property.includes('*'))
    const counts = new Map<string, string[]>()

    for (const item of activeProperties) {
      counts.set(item.property, [...(counts.get(item.property) ?? []), item.entry])
    }

    const duplicates = Array.from(counts.entries())
      .filter(([, entries]) => entries.length > 1)
      .map(([property, entries]) => `${property}: ${entries.join(', ')}`)

    expect(duplicates).toEqual([])
  })
})

function handledDeclarationProperties(): string[] {
  const source = readFileSync(resolve('src/implementation/css/apply-declaration.ts'), 'utf8')
  const switchStart = source.indexOf('switch (normalizedProperty)')
  const defaultStart = source.indexOf('    default:', switchStart)

  if (switchStart === -1 || defaultStart === -1) {
    throw new Error('Could not find applyDeclaration property switch')
  }

  const propertySwitch = source.slice(switchStart, defaultStart)
  return Array.from(propertySwitch.matchAll(/case '([^']+)'/g), (match) => match[1]).sort()
}
