import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { readDocumentationContext, renderDocumentationPage } from './docs-page-shell.mjs'
import { articleLayout, guideLayout, renderMarkdownFragment, renderMarkdownPage } from '../docs-engine/render-md.mjs'

const root = resolve(import.meta.dirname, '..')
const context = await readDocumentationContext(root)
const siteRoot = resolve(root, '.site')
const exampleNames = ['material-ui', 'ant-design']
const exampleCompatibility = await Promise.all(exampleNames.map(async (example) => ({
  example,
  profile: JSON.parse(await readFile(resolve(root, 'examples', example, 'compatibility.json'), 'utf8')),
  report: JSON.parse(await readFile(resolve(root, 'examples', example, 'compatibility-report.json'), 'utf8')),
  setup: renderMarkdownFragment(await hydrateSetupMarkdown(example)),
})))
await mkdir(siteRoot, { recursive: true })

for (const asset of ['site.css', 'site.js', 'css-support-search.js']) {
  await copyFile(resolve(root, 'docs-engine/assets', asset), resolve(siteRoot, asset))
}

const paritySourceDirectory = resolve(root, 'test/browser-parity/cases')
const paritySourceOutput = resolve(siteRoot, 'data/parity-sources')
const paritySourceFiles = (await readdir(paritySourceDirectory))
  .filter((file) => file.endsWith('.test.ts'))
  .sort()
await mkdir(paritySourceOutput, { recursive: true })
await Promise.all(paritySourceFiles.map((file) =>
  copyFile(resolve(paritySourceDirectory, file), resolve(paritySourceOutput, file)),
))
console.log(`Generated ${paritySourceFiles.length} parity source previews.`)

const pages = [
  {
    source: 'docs/guide.md',
    output: '.site/index.html',
    page: 'index.html',
    render: (source) => renderMarkdownPage(source, guideLayout),
  },
  {
    source: 'docs/examples.md',
    output: '.site/examples.html',
    page: 'examples.html',
    render: (source) => renderExamplesPage(source, exampleCompatibility),
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

for (const page of pages) {
  const source = await readFile(resolve(root, page.source), 'utf8')
  const rendered = page.render
    ? page.render(source)
    : {
        pageStyles: requiredMatch(source, /<style>([\s\S]*?)<\/style>/, page.source, 'page styles'),
        body: requiredMatch(source, page.bodyPattern, page.source, 'page body', 0),
        inlineModule: page.inlineModulePattern
          ? requiredMatch(source, page.inlineModulePattern, page.source, 'inline module')
          : '',
      }
  const output = renderDocumentationPage({ ...context, ...page, ...rendered })
  const outputPath = resolve(root, page.output)

  if (process.argv.includes('--check')) {
    await writeFile(outputPath, output)
    console.log(`Validated and generated ${page.output} from ${page.source}.`)
  } else {
    await writeFile(outputPath, output)
    console.log(`Generated ${page.output} from ${page.source}.`)
  }
}

for (const example of exampleNames) {
  const source = resolve(root, 'examples', example, 'dist')
  const output = resolve(siteRoot, 'examples', example)
  await rm(output, { recursive: true, force: true })
  await cp(source, output, { recursive: true, force: true })
  await copyFile(
    resolve(root, 'examples', example, 'compatibility.json'),
    resolve(output, 'compatibility.json'),
  )
  await copyFile(
    resolve(root, 'examples', example, 'compatibility-report.json'),
    resolve(output, 'compatibility-report.json'),
  )
  console.log(`Copied ${example} example to .site/examples/${example}.`)
}

function renderExamplesPage(source, reports) {
  const rendered = renderMarkdownPage(source, articleLayout)
  const cards = reports.map(({ example, profile, report, setup }) => `
    <article class="compatibility-card">
      <div class="compatibility-heading">
        <div>
          <h3>${escapeHtml(profile.library)}</h3>
          <code>${escapeHtml(profile.package)}</code>
        </div>
        <div class="agreement-score"><strong>${formatPercentage(report.summary.overallAgreement)}</strong><span>Average of checkpoint agreement</span></div>
      </div>
      <div class="report-metrics">
        <div><strong>${formatPercentage(report.summary.coverage)}</strong><span>Elements captured in both environments</span></div>
        <div><strong>${report.steps.length}</strong><span>Interaction checkpoints</span></div>
        <div><strong>${report.summary.uniqueDiscrepancies ?? report.summary.discrepancies}</strong><span>Unique difference signatures</span></div>
      </div>
      <div class="report-links">
        <a class="report-action primary" href="./examples/${encodeURIComponent(example)}/" target="_blank" rel="noopener">Launch ${escapeHtml(profile.library)}</a>
        <a class="report-action" href="https://github.com/BenjaBobs/dom-layout-shim/blob/main/examples/${encodeURIComponent(example)}/test/compatibility-scenario.test.tsx">View scenario source</a>
        <a class="report-action" href="./examples/${encodeURIComponent(example)}/compatibility-report.json" target="_blank" rel="noopener">View JSON report</a>
      </div>
      <p class="report-meta">Measured with Chromium ${escapeHtml(report.metadata.chromiumVersion)} at ${report.metadata.viewport.width} × ${report.metadata.viewport.height}.</p>
      <details class="setup-guide">
        <summary><span>Use DOM Layout Shim with ${escapeHtml(profile.library)}</span><small>Test setup and first assertion</small></summary>
        <div class="setup-content">${setup}</div>
      </details>
      <h4>Interaction checkpoints</h4>
      <div class="checkpoint-list">
        ${report.steps.map((step) => `
          <details class="checkpoint">
            <summary><span>${escapeHtml(step.label)}</span><strong title="Equal-weight average of geometry, visibility, and hit-testing agreement">${formatPercentage(step.scores.overall)}</strong></summary>
            <dl class="score-grid">
              <div class="score score-coverage"><dt>Coverage <span>Tracked elements captured in both environments</span></dt><dd>${formatPercentage(step.scores.coverage)}</dd></div>
              <div class="score score-geometry"><dt>Geometry <span><code>x</code>, <code>y</code>, width, and height fields within 1 px</span></dt><dd>${formatPercentage(step.scores.geometry)}</dd></div>
              <div class="score score-visibility"><dt>Visibility <span>Displayed or hidden state matches Chromium</span></dt><dd>${formatPercentage(step.scores.visibility)}</dd></div>
              <div class="score score-hit-testing"><dt>Hit testing <span>Center point resolves to the same element</span></dt><dd>${formatPercentage(step.scores.hitTesting)}</dd></div>
            </dl>
            <p>${step.observations} observations · ${step.discrepancies.length} differences</p>
            ${step.discrepancies.length === 0
              ? '<p>No differences recorded.</p>'
              : `<ul class="discrepancy-list">${step.discrepancies.map(renderDiscrepancy).join('')}</ul>`}
          </details>
        `).join('')}
      </div>
      ${renderDiagnosticPriorities(report)}
      ${renderUnsupportedCss(report)}
    </article>
  `).join('')

  return {
    ...rendered,
    body: rendered.body.replace('<p>{{compatibility-findings}}</p>', `<div class="compatibility-grid">${cards}</div>`),
    pageStyles: `${rendered.pageStyles}
      .compatibility-grid { display: grid; gap: 1.5rem; }
      .compatibility-card { padding: clamp(1.1rem, 3vw, 1.75rem); border-radius: 14px; background: var(--panel); box-shadow: var(--shadow-panel); }
      .compatibility-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
      .compatibility-heading h3 { margin: 0 0 .25rem; }
      .agreement-score { display: grid; flex: none; text-align: right; }
      .agreement-score strong { color: var(--brand); font-size: 1.4rem; line-height: 1.2; }
      .agreement-score span, .report-metrics span { color: var(--muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
      .report-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; margin: 1.25rem 0; }
      .report-metrics div { display: grid; gap: .15rem; padding: .7rem .8rem; border-radius: 8px; background: var(--bg); }
      .report-metrics strong { font-size: 1.05rem; }
      .report-meta { margin: .75rem 0 0; color: var(--muted); font-size: .78rem; }
      .report-links { display: flex; flex-wrap: wrap; gap: .6rem; }
      .report-action { padding: .5rem .75rem; border: 1px solid var(--line); border-radius: 8px; color: var(--text); font-size: .82rem; font-weight: 700; text-decoration: none; }
      .report-action:hover { border-color: var(--brand); color: var(--brand); }
      .report-action.primary { border-color: var(--brand); background: var(--brand); color: var(--bg); }
      .setup-guide { margin-top: 1.25rem; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }
      .setup-guide > summary { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; cursor: pointer; font-weight: 700; }
      .setup-guide > summary small { color: var(--muted); font-weight: 400; }
      .setup-guide > summary:hover { color: var(--brand); }
      .setup-content { padding: .25rem 1rem 1rem; border-top: 1px solid var(--line); }
      .setup-content h4 { margin-top: 1.25rem; color: var(--text); font-size: .9rem; letter-spacing: 0; text-transform: none; }
      .setup-content p { color: var(--muted); font-size: .88rem; }
      .setup-content pre { max-height: 22rem; overflow: auto; font-size: .78rem; }
      .compatibility-card h4 { margin: 1.25rem 0 .5rem; color: var(--muted); font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
      .checkpoint-list { display: grid; gap: .5rem; }
      .checkpoint { border: 1px solid transparent; border-radius: 8px; background: var(--bg); transition: border-color .15s ease, background-color .15s ease; }
      .checkpoint:hover { border-color: color-mix(in srgb, var(--line) 80%, var(--brand)); background: color-mix(in srgb, var(--bg) 97%, var(--brand)); }
      .checkpoint summary { display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: .75rem; padding: .7rem .8rem; cursor: pointer; }
      .checkpoint summary::after { content: '›'; color: var(--muted); font-size: 1.35rem; line-height: 1; transition: transform .15s ease; }
      .checkpoint[open] summary::after { transform: rotate(90deg); }
      .checkpoint summary:focus-visible { border-radius: 8px; outline: 1px solid color-mix(in srgb, var(--brand) 55%, transparent); outline-offset: 1px; }
      .checkpoint > :not(summary) { margin-left: .8rem; margin-right: .8rem; }
      .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; }
      .score-grid .score { min-width: 0; padding: .55rem .65rem; border-top: 3px solid var(--metric-color); border-radius: 6px; background: color-mix(in srgb, var(--metric-color) 8%, transparent); }
      .score-grid dt { color: var(--metric-color); font-size: .72rem; font-weight: 700; }
      .score-grid dt > span { display: block; min-height: 2.5em; margin-top: .15rem; font-size: .68rem; line-height: 1.25; text-transform: none; }
      .score-grid dd { margin: .25rem 0 0; color: var(--text); font-weight: 700; }
      .score-coverage, .category-presence { --metric-color: #d6a84f; }
      .score-geometry, .category-geometry { --metric-color: #65a7df; }
      .score-visibility, .category-visibility { --metric-color: #70c999; }
      .score-hit-testing, .category-hit-testing { --metric-color: #b695df; }
      .discrepancy-list { display: grid; gap: .4rem; max-height: 18rem; overflow: auto; padding: .25rem 0; list-style: none; font-size: .78rem; }
      .discrepancy-list li { display: grid; grid-template-columns: max-content minmax(12rem,auto) 1fr; align-items: baseline; gap: .55rem; max-width: none; padding: .2rem .3rem; border-radius: 5px; }
      .discrepancy-list li:hover { background: color-mix(in srgb, var(--metric-color) 7%, transparent); }
      .discrepancy-kind { padding: .12rem .4rem; border-radius: 999px; background: color-mix(in srgb, var(--metric-color) 16%, transparent); color: var(--metric-color); font-size: .68rem; font-weight: 700; text-transform: uppercase; }
      .discrepancy-values { color: var(--muted); }
      .discrepancy-list code { overflow-wrap: anywhere; }
      .diagnostic-summary { margin-top: 1.25rem; }
      .diagnostic-summary > summary { cursor: pointer; color: var(--text); font-weight: 700; }
      .diagnostic-summary > summary:hover { color: var(--brand); }
      .priority-list { display: grid; gap: .45rem; margin: .7rem 0 0; padding: 0; list-style: none; }
      .priority-list li { display: grid; grid-template-columns: max-content minmax(0, 1fr) max-content; gap: .65rem; align-items: baseline; padding: .55rem .65rem; border-radius: 7px; background: var(--bg); font-size: .8rem; }
      .priority-list small { color: var(--muted); }
      .priority-badge { padding: .12rem .4rem; border-radius: 999px; background: color-mix(in srgb, var(--brand) 13%, transparent); color: var(--brand); font-size: .66rem; font-weight: 700; text-transform: uppercase; }
      .unsupported-property { display: grid; min-width: 0; gap: .18rem; }
      .unsupported-property > code { width: fit-content; }
      .unsupported-property small { overflow-wrap: anywhere; }
      .unsupported-property b { color: var(--text); font-weight: 600; }
      @media (max-width: 560px) {
        .compatibility-heading { align-items: stretch; flex-direction: column; }
        .agreement-score { text-align: left; }
        .report-metrics { grid-template-columns: 1fr; }
        .score-grid { grid-template-columns: repeat(2, 1fr); }
        .discrepancy-list li { grid-template-columns: 1fr; gap: .25rem; }
      }
    `,
  }
}

function renderDiagnosticPriorities(report) {
  const groups = report.discrepancyGroups ?? []
  if (groups.length === 0) return ''
  return `<details class="diagnostic-summary">
    <summary>Most repeated layout differences</summary>
    <ul class="priority-list">${groups.slice(0, 8).map((group) => `<li>
      <span class="priority-badge">${escapeHtml(group.category)}${group.field ? ` · ${escapeHtml(group.field)}` : ''}</span>
      <span><code>${escapeHtml(group.selector)}</code>${group.scope ? ` <small>${escapeHtml(group.scope)}</small>` : ''}</span>
      <small>${group.occurrences} checkpoint${group.occurrences === 1 ? '' : 's'}</small>
    </li>`).join('')}</ul>
  </details>`
}

function renderUnsupportedCss(report) {
  const properties = report.unsupportedCss?.properties ?? []
  if (properties.length === 0) return ''
  const actionable = properties.filter((property) => property.priority !== 'visual-or-inert')
  return `<details class="diagnostic-summary">
    <summary>Unsupported CSS observed (${properties.length} properties)</summary>
    <p class="report-meta">Ordered by likely layout impact and how often declarations were encountered. Computed values help identify fallback declarations that did not win the cascade.</p>
    <ul class="priority-list">${actionable.slice(0, 12).map((property) => `<li>
      <span class="priority-badge">${escapeHtml((property.priority ?? 'unclassified').replaceAll('-', ' '))}</span>
      <span class="unsupported-property"><code>${escapeHtml(property.property)}</code>${renderCssValueSummary(property)}</span>
      <small>${property.occurrences} occurrence${property.occurrences === 1 ? '' : 's'}</small>
    </li>`).join('')}</ul>
  </details>`
}

function renderCssValueSummary(property) {
  const readableValues = property.values.filter((value) => !looksLikeSerializedSyntax(value))
  const opaqueCount = property.values.length - readableValues.length
  const computedValues = property.computedValues ?? []
  const parts = []
  if (readableValues.length > 0) parts.push(`<small><b>Authored:</b> ${escapeHtml(readableValues.slice(0, 3).join(', '))}${readableValues.length > 3 ? '…' : ''}</small>`)
  if (computedValues.length > 0) parts.push(`<small><b>Computed:</b> ${escapeHtml(computedValues.slice(0, 3).join(', '))}${computedValues.length > 3 ? '…' : ''}</small>`)
  if (opaqueCount > 0) parts.push(`<small>${opaqueCount} complex parsed value${opaqueCount === 1 ? '' : 's'} available in the JSON report</small>`)
  return parts.join('')
}

function looksLikeSerializedSyntax(value) {
  const trimmed = value.trim()
  return (trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.includes('"type"')
}

async function hydrateSetupMarkdown(example) {
  const source = await readFile(resolve(root, 'examples', example, 'docs/layout-shim-setup.md'), 'utf8')
  let hydrated = source

  for (const match of source.matchAll(/\{\{source:([^#}]+)#([^:}]+):([^}]+)\}\}/g)) {
    const [, relativePath, region, language] = match
    const exampleRoot = resolve(root, 'examples', example)
    const sourcePath = resolve(exampleRoot, relativePath)
    if (!sourcePath.startsWith(`${exampleRoot}${sep}`)) throw new Error(`Setup source escapes ${example}: ${relativePath}`)

    const file = await readFile(sourcePath, 'utf8')
    const excerpts = region.split('+').map((name) => extractDocumentationRegion(file, name, relativePath))
    const code = excerpts.map((excerpt) => excerpt.code).join('\n__DOCS_CODE_SKIP__\n')
    const lineRanges = excerpts.map(({ code, startLine }) => `${startLine}-${startLine + code.split('\n').length - 1}`).join(',')
    const startLine = excerpts[0].startLine
    const githubUrl = `https://github.com/BenjaBobs/dom-layout-shim/blob/main/examples/${encodeURIComponent(example)}/${relativePath}#L${startLine}`
    hydrated = hydrated.replace(
      match[0],
      `\`\`\`${language} title="${relativePath}" source="${githubUrl}" start="${startLine}" lines="${lineRanges}"\n${code}\n\`\`\``,
    )
  }

  if (hydrated.includes('{{source:')) throw new Error(`Unresolved setup source in ${example}`)
  return hydrated
}

function extractDocumentationRegion(source, region, relativePath) {
  const start = `// docs:start ${region}`
  const end = `// docs:end ${region}`
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end)
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`Missing region ${region} in ${relativePath}`)

  const contentStart = source.indexOf('\n', startIndex) + 1
  const lines = source.slice(contentStart, endIndex).trimEnd().split('\n')
  const indentation = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)[0].length))
  const startLine = source.slice(0, contentStart).split('\n').length
  return { code: lines.map((line) => line.slice(indentation)).join('\n'), startLine }
}

function renderDiscrepancy(discrepancy) {
  const category = String(discrepancy.category)
  const field = discrepancy.field ? ` · ${escapeHtml(discrepancy.field)}` : ''
  return `<li class="category-${escapeHtml(category)}"><span class="discrepancy-kind">${escapeHtml(category.replace('-', ' '))}${field}</span><code>${escapeHtml(discrepancy.selector)}</code><span class="discrepancy-values">expected <code>${escapeHtml(formatValue(discrepancy.expected))}</code> · observed <code>${escapeHtml(formatValue(discrepancy.actual))}</code></span></li>`
}

function formatValue(value) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function formatPercentage(value) {
  return `${Number(value).toFixed(1)}%`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function requiredMatch(source, pattern, file, description, group = 1) {
  const match = pattern.exec(source)
  if (!match?.[group]) throw new Error(`Missing ${description} in ${file}`)
  return match[group]
}
