import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const recordsDirectory = resolve(root, 'support/css')
const fixtureDirectory = resolve(root, 'test/browser-parity/cases')
const generatedJsonPath = resolve(root, 'docs/data/css-support.json')
const generatedIndexPath = resolve(root, 'docs/data/css-property-index.json')
const generatedSchemaPath = resolve(root, 'docs/data/css-support.schema.json')
const generatedTypeScriptPath = resolve(root, 'src/css/css-support-inventory.generated.ts')
const schemaSource = await readFile(resolve(root, 'support/css-support.schema.json'), 'utf8')

const supportValues = new Set(['supported', 'partial', 'unsupported', 'unknown'])
const parityValues = new Set(['verified', 'partially-verified', 'unverified', 'known-mismatch', 'not-applicable'])
const effects = new Set(['layout', 'hit-testing', 'accepted-inert', 'visual-ignored', 'source'])
const owners = new Set(['css-parser', 'taffy-adapter', 'hit-testing', 'text', 'dom-api'])
const noteKinds = new Set(['browser-parity', 'behavior-quirk', 'implementation-quirk', 'taffy-compat', 'limitation', 'todo'])
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const [command = 'validate', ...arguments_] = process.argv.slice(2)
const records = await loadRecords()
const errors = validateRecords(records)

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error)
  }
  process.exitCode = 1
} else if (command === 'validate') {
  console.log(`CSS support inventory is valid (${records.length} records).`)
} else if (command === 'generate') {
  await generate(records)
} else if (command === 'check') {
  await checkGenerated(records)
} else if (command === 'query') {
  query(records, arguments_)
} else {
  console.error(`Unknown command: ${command}`)
  console.error('Usage: node scripts/css-support.mjs <validate|generate|check|query> [query] [--json]')
  process.exitCode = 1
}

async function loadRecords() {
  const fileNames = (await readdir(recordsDirectory))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()

  return Promise.all(fileNames.map(async (fileName) => {
    const path = resolve(recordsDirectory, fileName)
    const record = JSON.parse(await readFile(path, 'utf8'))
    return { ...record, sourceFile: `support/css/${fileName}` }
  }))
}

function validateRecords(records) {
  const errors = []
  const recordIds = new Set()
  const activeProperties = new Map()

  for (const record of records) {
    const location = record.sourceFile
    requireValue(errors, location, record.schemaVersion === 1, 'schemaVersion must be 1')
    requireValue(errors, location, typeof record.id === 'string' && idPattern.test(record.id), 'id must be kebab-case')
    requireValue(errors, location, basename(location, '.json') === record.id, 'file name must match id')
    requireValue(errors, location, !recordIds.has(record.id), `duplicate record id "${record.id}"`)
    recordIds.add(record.id)
    requireValue(errors, location, typeof record.title === 'string' && record.title.length > 0, 'title is required')
    requireValue(errors, location, effects.has(record.effect), `unknown effect "${record.effect}"`)
    requireValue(errors, location, owners.has(record.owner), `unknown owner "${record.owner}"`)
    requireValue(errors, location, Array.isArray(record.subjects?.properties), 'subjects.properties must be an array')
    requireValue(errors, location, Array.isArray(record.subjects?.elements), 'subjects.elements must be an array')
    requireValue(errors, location, Array.isArray(record.claims) && record.claims.length > 0, 'at least one claim is required')

    const claimIds = new Set()
    for (const claim of record.claims ?? []) {
      const claimLocation = `${location}#${claim.id ?? '?'}`
      requireValue(errors, claimLocation, typeof claim.id === 'string' && idPattern.test(claim.id), 'claim id must be kebab-case')
      requireValue(errors, claimLocation, !claimIds.has(claim.id), `duplicate claim id "${claim.id}"`)
      claimIds.add(claim.id)
      requireValue(errors, claimLocation, supportValues.has(claim.support), `unknown support "${claim.support}"`)
      requireValue(errors, claimLocation, parityValues.has(claim.parity?.status), `unknown parity status "${claim.parity?.status}"`)
      requireValue(errors, claimLocation, Array.isArray(claim.parity?.fixtures), 'parity.fixtures must be an array')
      requireValue(errors, claimLocation, Array.isArray(claim.notes), 'notes must be an array')
      requireValue(errors, claimLocation, claim.properties === undefined || Array.isArray(claim.properties), 'properties must be an array')

      for (const property of claim.properties ?? []) {
        requireValue(
          errors,
          claimLocation,
          record.subjects.properties.includes(property),
          `claim property "${property}" is not declared by the record`,
        )
      }

      if (claim.parity?.status === 'verified') {
        requireValue(errors, claimLocation, claim.parity.fixtures.length > 0, 'verified claims require fixture evidence')
      }
      if (claim.parity?.status === 'not-applicable') {
        requireValue(errors, claimLocation, claim.parity.fixtures.length === 0, 'not-applicable claims cannot reference fixtures')
      }
      for (const fixture of claim.parity?.fixtures ?? []) {
        requireValue(
          errors,
          claimLocation,
          existsSync(resolve(fixtureDirectory, `${fixture}.test.ts`)),
          `fixture "${fixture}" does not exist`,
        )
      }
      for (const note of claim.notes ?? []) {
        requireValue(errors, claimLocation, noteKinds.has(note.kind), `unknown note kind "${note.kind}"`)
        requireValue(errors, claimLocation, typeof note.text === 'string' && note.text.length > 0, 'note text is required')
      }
    }

    const scopedClaims = (record.claims ?? []).filter((claim) => claim.properties !== undefined)
    if (scopedClaims.length > 0) {
      for (const property of record.subjects?.properties ?? []) {
        requireValue(
          errors,
          location,
          scopedClaims.some((claim) => claim.properties.includes(property)),
          `property "${property}" has no scoped support claim`,
        )
      }
    }

    if ((record.claims ?? []).some((claim) => claim.support !== 'unsupported')) {
      for (const property of record.subjects?.properties ?? []) {
        if (property.includes(':') || property.includes('*')) continue
        const previous = activeProperties.get(property)
        requireValue(errors, location, previous === undefined, `property "${property}" is also active in ${previous}`)
        activeProperties.set(property, location)
      }
    }
  }

  return errors
}

function requireValue(errors, location, condition, message) {
  if (!condition) errors.push(`${location}: ${message}`)
}

async function generate(records) {
  const generated = buildGeneratedOutputs(records)
  await mkdir(resolve(root, 'docs/data'), { recursive: true })
  await writeFile(generatedJsonPath, generated.inventory)
  await writeFile(generatedIndexPath, generated.propertyIndex)
  await writeFile(generatedSchemaPath, generated.schema)
  await writeFile(generatedTypeScriptPath, generated.typeScript)
  console.log(`Generated ${records.length} records for the package and docs site.`)
}

async function checkGenerated(records) {
  const generated = buildGeneratedOutputs(records)
  const expected = [
    [generatedJsonPath, generated.inventory],
    [generatedIndexPath, generated.propertyIndex],
    [generatedSchemaPath, generated.schema],
    [generatedTypeScriptPath, generated.typeScript],
  ]
  const stale = []

  for (const [path, contents] of expected) {
    const current = existsSync(path) ? await readFile(path, 'utf8') : ''
    if (current !== contents) stale.push(path.slice(root.length + 1))
  }

  if (stale.length > 0) {
    for (const path of stale) console.error(`${path} is stale or missing`)
    console.error('Run `pnpm run css:generate` and commit the result.')
    process.exitCode = 1
    return
  }
  console.log(`Generated CSS support data is current (${records.length} records).`)
}

function buildGeneratedOutputs(records) {
  const normalized = records.map(({ sourceFile, ...record }) => ({
    ...record,
    source: sourceFile,
    status: aggregateSupport(record.claims),
    parityStatus: aggregateParity(record.claims),
  }))
  const propertyIndex = Object.fromEntries(
    normalized
      .flatMap((record) => record.subjects.properties.map((property) => [property, record.id]))
      .sort(([left], [right]) => left.localeCompare(right)),
  )

  const inventory = formatJson({
    schemaVersion: 1,
    generatedFrom: 'support/css/*.json',
    records: normalized,
  })
  const propertyIndexOutput = formatJson({
    schemaVersion: 1,
    generatedFrom: 'support/css/*.json',
    properties: propertyIndex,
  })
  const typeScript = [
    '// Generated by `pnpm run css:generate`. Do not edit directly.',
    "import type { CssSupportRecord } from './css-support-inventory.ts'",
    '',
    `export const cssSupportInventory = ${JSON.stringify(normalized, null, 2)} as const satisfies readonly CssSupportRecord[]`,
    '',
  ].join('\n')

  return {
    inventory,
    propertyIndex: propertyIndexOutput,
    schema: schemaSource,
    typeScript,
  }
}

function query(records, arguments_) {
  const json = arguments_.includes('--json')
  const queryText = arguments_
    .filter((argument) => argument !== '--json' && argument !== '--')
    .join(' ')
    .trim()
  const terms = queryText.toLowerCase()
  if (!queryText) {
    console.error('Provide a property, value, feature, fixture, or note to search for.')
    process.exitCode = 1
    return
  }

  const property = terms.split(':', 1)[0].trim()
  const exactPropertyMatches = records.filter((record) => record.subjects.properties.includes(property))
  const matches = exactPropertyMatches.length > 0
    ? exactPropertyMatches
    : records.filter((record) => JSON.stringify(record).toLowerCase().includes(terms))
  if (json) {
    console.log(JSON.stringify(matches.map(({ sourceFile, ...record }) => ({ ...record, source: sourceFile })), null, 2))
    return
  }
  if (matches.length === 0) {
    console.log(`No CSS support records matched "${queryText}".`)
    process.exitCode = 2
    return
  }
  for (const record of matches) {
    const relevantClaims = exactPropertyMatches.length > 0
      ? record.claims.filter((claim) => claim.properties?.includes(property))
      : record.claims
    console.log(`${record.id}: ${record.title}`)
    console.log(`  properties: ${record.subjects.properties.join(', ') || 'none'}`)
    console.log(`  support: ${aggregateSupport(record.claims)}; parity: ${aggregateParity(record.claims)}`)
    for (const claim of relevantClaims) {
      console.log(`  - ${claim.id}: ${claim.support}, ${claim.parity.status}`)
    }
    console.log(`  source: ${record.sourceFile}`)
  }
}

function aggregateSupport(claims) {
  const values = new Set(claims.map((claim) => claim.support))
  if (values.size === 1) return claims[0].support
  if (values.has('partial') || values.has('supported')) return 'partial'
  if (values.has('unknown')) return 'unknown'
  return 'unsupported'
}

function aggregateParity(claims) {
  const values = new Set(claims.map((claim) => claim.parity.status))
  if (values.size === 1) return claims[0].parity.status
  if (values.has('known-mismatch')) return 'known-mismatch'
  if (values.has('verified') || values.has('partially-verified')) return 'partially-verified'
  if (values.has('unverified')) return 'unverified'
  return 'not-applicable'
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}
