import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readDocumentationContext, renderDocumentationPage } from './docs-page-shell.mjs'

const root = resolve(import.meta.dirname, '..')
const context = await readDocumentationContext(root)
const siteRoot = resolve(root, '.site')
await mkdir(siteRoot, { recursive: true })

for (const asset of ['site.css', 'site.js', 'css-support-search.js']) {
  await copyFile(resolve(root, 'docs-engine/assets', asset), resolve(siteRoot, asset))
}

const pages = [
  {
    source: 'docs-engine/guide.template.html',
    output: '.site/index.html',
    title: 'DOM Layout Shim guide',
    description: 'Guide to deterministic layout and hit testing with DOM Layout Shim.',
    page: 'index.html',
    bodyPattern: /<main>[\s\S]*<\/main>/,
  },
  {
    source: 'docs-engine/css-support-status.template.html',
    output: '.site/css-support-status.html',
    title: 'CSS Support Status',
    description: 'Searchable implementation and Chromium parity status for CSS supported by DOM Layout Shim.',
    page: 'css-support-status.html',
    bodyPattern: /<header>[\s\S]*<\/header>[\s\S]*?<main>[\s\S]*?<\/main>/,
    inlineModulePattern: /<script type="module">([\s\S]*?)<\/script>/,
  },
]

let stale = false
for (const page of pages) {
  const source = await readFile(resolve(root, page.source), 'utf8')
  const pageStyles = requiredMatch(source, /<style>([\s\S]*?)<\/style>/, page.source, 'page styles')
  const body = requiredMatch(source, page.bodyPattern, page.source, 'page body', 0)
  const inlineModule = page.inlineModulePattern
    ? requiredMatch(source, page.inlineModulePattern, page.source, 'inline module')
    : ''
  const output = renderDocumentationPage({ ...context, ...page, pageStyles, body, inlineModule })
  const outputPath = resolve(root, page.output)

  if (process.argv.includes('--check')) {
    const current = await readFile(outputPath, 'utf8').catch(() => '')
    if (current !== output) {
      console.error(`${page.output} is stale. Run node scripts/generate-docs-pages.mjs.`)
      stale = true
    }
  } else {
    await writeFile(outputPath, output)
    console.log(`Generated ${page.output} from ${page.source}.`)
  }
}

if (stale) process.exitCode = 1

function requiredMatch(source, pattern, file, description, group = 1) {
  const match = pattern.exec(source)
  if (!match?.[group]) throw new Error(`Missing ${description} in ${file}`)
  return match[group]
}
