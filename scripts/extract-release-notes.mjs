import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

const [version, outputPath] = process.argv.slice(2)

if (!version || !outputPath) {
  throw new Error('Usage: node scripts/extract-release-notes.mjs <version> <output-path>')
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
const heading = `## ${version}`
const start = changelog.indexOf(heading)

if (start === -1) {
  throw new Error(`CHANGELOG.md has no ${heading} section`)
}

const nextHeading = changelog.indexOf('\n## ', start + heading.length)
const notes = changelog
  .slice(start + heading.length, nextHeading === -1 ? undefined : nextHeading)
  .trim()

if (!notes) {
  throw new Error(`CHANGELOG.md has no release notes for ${version}`)
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${notes}\n`)
