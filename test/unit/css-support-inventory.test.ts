import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cssSupportInventory, getInventoriedCssProperties } from '../../src/index.ts'

describe('CSS support inventory', () => {
  it('tracks every declaration property handled by applyDeclaration', () => {
    const inventoried = new Set(getInventoriedCssProperties())
    const missing = handledDeclarationProperties().filter((property) => !inventoried.has(property))

    expect(missing).toEqual([])
  })

  it('references existing browser parity fixtures', () => {
    const missing = cssSupportInventory.flatMap((entry) =>
      (entry.parity ?? [])
        .filter((fixture) => !existsSync(resolve('test/browser-parity/cases', `${fixture}.test.ts`)))
        .map((fixture) => `${entry.id}: ${fixture}`),
    )

    expect(missing).toEqual([])
  })

  it('does not list the same implemented property in multiple active entries', () => {
    const activeProperties = cssSupportInventory
      .filter((entry) => entry.status !== 'todo')
      .flatMap((entry) => entry.properties.map((property) => ({ entry: entry.id, property })))
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
  const source = readFileSync(resolve('src/css/apply-declaration.ts'), 'utf8')
  const switchStart = source.indexOf('switch (normalizedProperty)')
  const defaultStart = source.indexOf('    default:', switchStart)

  if (switchStart === -1 || defaultStart === -1) {
    throw new Error('Could not find applyDeclaration property switch')
  }

  const propertySwitch = source.slice(switchStart, defaultStart)
  return Array.from(propertySwitch.matchAll(/case '([^']+)'/g), (match) => match[1]).sort()
}
