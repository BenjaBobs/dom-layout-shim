import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const scopes = ['package', 'parity', 'docs', 'release']

const rules = [
  { match: prefix('src/'), scopes: ['package', 'parity'] },
  { match: prefix('test/unit/'), scopes: ['package'] },
  { match: prefix('test/bench/'), scopes: ['package'] },
  { match: prefix('test/browser-parity/'), scopes: ['parity'] },
  { match: exact('vitest.config.ts'), scopes: ['package'] },
  { match: exact('vitest.browser-parity.config.ts'), scopes: ['parity'] },
  { match: oneOf('package.json', 'pnpm-lock.yaml'), scopes: ['package', 'parity'] },
  { match: prefix('tsconfig'), scopes: ['package', 'parity'] },
  { match: prefix('support/'), scopes: ['package', 'docs'] },
  { match: prefix('docs/'), scopes: ['docs'] },
  { match: oneOf('README.md', 'LICENSE'), scopes: ['package', 'docs'] },
  { match: exact('scripts/css-support.mjs'), scopes: ['package', 'docs'] },
  { match: oneOf('scripts/clean-build-output.mjs', 'scripts/test-package-consumer.mjs'), scopes: ['package'] },
  { match: oneOf('scripts/extract-release-notes.mjs', 'scripts/inspect-release-state.mjs'), scopes: ['release'] },
  { match: exact('scripts/serve-css-support-status.mjs'), scopes: ['docs'] },
  { match: exact('scripts/check-pr-history.mjs'), scopes: ['release'] },
  { match: exact('scripts/affected-scopes.mjs'), scopes },
  { match: exact('.github/workflows/ci.yml'), scopes: ['package', 'parity'] },
  { match: exact('.github/workflows/docs.yml'), scopes: ['docs'] },
  { match: exact('.github/workflows/release.yml'), scopes: ['release'] },
  { match: prefix('.github/'), scopes: ['release'] },
  { match: prefix('.changeset/'), scopes: ['release'] },
  { match: exact('CHANGELOG.md'), scopes: ['release'] },
  { match: oneOf('AGENTS.md', '.gitignore', 'dom-layout-shim-hit-testing-design.md'), scopes: [] },
]

export function classifyAffectedScopes(paths, { forceAll = false } = {}) {
  const result = Object.fromEntries(scopes.map((scope) => [scope, forceAll]))
  const reasons = Object.fromEntries(scopes.map((scope) => [scope, forceAll ? ['manual run'] : []]))

  if (forceAll) {
    return { ...result, reasons }
  }

  for (const path of paths) {
    const rule = rules.find(({ match }) => match(path))
    const affectedScopes = rule?.scopes ?? scopes

    for (const scope of affectedScopes) {
      result[scope] = true
      reasons[scope].push(path)
    }
  }

  return { ...result, reasons }
}

export function changedPaths(baseSha, headSha) {
  if (!baseSha || !headSha || /^0+$/.test(baseSha)) {
    return null
  }

  const output = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACDMRTUXB', baseSha, headSha], {
    encoding: 'utf8',
  }).trim()

  return output ? output.split('\n') : []
}

function exact(expected) {
  return (path) => path === expected
}

function oneOf(...expected) {
  const paths = new Set(expected)
  return (path) => paths.has(path)
}

function prefix(expected) {
  return (path) => path.startsWith(expected)
}

function writeGithubOutput(result) {
  const outputPath = process.env.GITHUB_OUTPUT

  if (!outputPath) {
    return
  }

  appendFileSync(
    outputPath,
    `${scopes.map((scope) => `${scope}=${result[scope]}`).join('\n')}\n`,
  )
}

function writeSummary(paths, result) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY

  if (!summaryPath) {
    return
  }

  const rows = scopes.map((scope) => {
    const reason = result.reasons[scope].length > 0
      ? result.reasons[scope].map((path) => `\`${path}\``).join(', ')
      : 'Not affected'
    return `| ${scope} | ${result[scope] ? 'yes' : 'no'} | ${reason} |`
  })

  appendFileSync(summaryPath, [
    '## Affected scopes',
    '',
    '| Scope | Run | Matching changes |',
    '| --- | --- | --- |',
    ...rows,
    '',
    `<details><summary>Changed paths (${paths?.length ?? 'unavailable'})</summary>`,
    '',
    ...(paths?.map((path) => `- \`${path}\``) ?? ['Full validation was selected.']),
    '',
    '</details>',
    '',
  ].join('\n'))
}

function main() {
  const [baseSha, headSha, eventName] = process.argv.slice(2)
  const paths = eventName === 'workflow_dispatch' ? null : changedPaths(baseSha, headSha)
  const result = classifyAffectedScopes(paths ?? [], { forceAll: paths === null })

  writeGithubOutput(result)
  writeSummary(paths, result)

  for (const scope of scopes) {
    console.log(`${scope}: ${result[scope]}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
