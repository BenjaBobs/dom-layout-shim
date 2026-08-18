import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readDocumentationContext, renderDocumentationPage } from './docs-page-shell.mjs'
import { articleLayout, guideLayout, renderMarkdownPage } from '../docs-engine/render-md.mjs'

const root = resolve(import.meta.dirname, '..')
const context = await readDocumentationContext(root)
const siteRoot = resolve(root, '.site')
const exampleNames = ['material-ui', 'ant-design']
const exampleCompatibility = await Promise.all(exampleNames.map(async (example) => ({
  example,
  profile: JSON.parse(await readFile(resolve(root, 'examples', example, 'compatibility.json'), 'utf8')),
  report: JSON.parse(await readFile(resolve(root, 'examples', example, 'compatibility-report.json'), 'utf8')),
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
  const cards = reports.map(({ example, profile, report }) => `
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
        <div><strong>${report.summary.discrepancies}</strong><span>Recorded differences</span></div>
      </div>
      <div class="report-links">
        <a class="report-action primary" href="./examples/${encodeURIComponent(example)}/" target="_blank" rel="noopener">Launch ${escapeHtml(profile.library)}</a>
        <a class="report-action" href="https://github.com/BenjaBobs/dom-layout-shim/blob/main/examples/${encodeURIComponent(example)}/test/compatibility-scenario.test.tsx">View scenario source</a>
        <a class="report-action" href="./examples/${encodeURIComponent(example)}/compatibility-report.json" target="_blank" rel="noopener">View JSON report</a>
      </div>
      <p class="report-meta">Measured with Chromium ${escapeHtml(report.metadata.chromiumVersion)} at ${report.metadata.viewport.width} × ${report.metadata.viewport.height}.</p>
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
