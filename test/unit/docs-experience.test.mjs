import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const readDocumentationSource = (name) => readFile(resolve(process.cwd(), name), 'utf8')

afterEach(() => {
  document.body.innerHTML = ''
  history.replaceState({}, '', '/')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('generated documentation experience', () => {
  it('renders accessible support controls and stable record links', async () => {
    const page = await readDocumentationSource('docs-engine/css-support-status.template.html')

    expect(page).toContain('<label class="visually-hidden" for="search">')
    expect(page).toContain('id="resultCount" aria-live="polite"')
    expect(page).toContain('id="clearFilters"')
    expect(page).toContain('<tr id="${escapeHtml(entry.id)}">')
    expect(page).toContain('class="topic-permalink" href="#${escapeHtml(entry.id)}"')
    expect(page).toContain("{ label: 'Support topics', value: inventory.length")
    expect(page).toContain('class="metric${metric.status ? \' metric-filter\' : \'\'}"')
    expect(page).toContain("statusField('Implementation support'")
    expect(page).toContain("statusField('Chromium parity'")
    expect(page).toContain("'browser-parity': { label: 'Verified behavior'")
    expect(page).toContain('renderInlineCode(note.text, query)')
    expect(page).toContain('id="fixtureDialog" aria-labelledby="fixtureDialogTitle"')
    expect(page).toContain('class="chip fixture-preview"')
    expect(page).toContain('class="fixture-source-link"')
    expect(page).toContain('class="claim-evidence"')
    expect(page).toContain('Chromium parity tests')
    expect(page).toContain("highlight(`${value}.test.ts`, query)")
    expect(page).toContain('.fixture-evidence {\n      display: inline-flex;\n      min-width: 0;\n      align-items: stretch;')
    expect(page).toContain('.parity-badge {\n      border: 0;\n      background: color-mix(in srgb, currentColor 13%, transparent);')
    expect(page).toContain('.note-taffy-compat { color: var(--teal);')
    expect(page).toContain('overflow-wrap: anywhere;')
    expect(page).toContain('width: calc(100vw - 16px);')
    expect(page).not.toContain('box-shadow: var(--shadow-panel);\n      overflow: hidden;')

    const generator = await readDocumentationSource('scripts/generate-docs-pages.mjs')
    expect(generator).toContain("const paritySourceOutput = resolve(siteRoot, 'data/parity-sources')")
    expect(generator).toContain(".filter((file) => file.endsWith('.test.ts'))")
    expect(generator).toContain("const exampleNames = ['material-ui', 'ant-design']")
    expect(generator).toContain("await cp(source, output, { recursive: true, force: true })")
    expect(generator).toContain("JSON.parse(await readFile(resolve(root, 'examples', example, 'compatibility-report.json')")
    expect(generator).toContain('class="compatibility-card"')
    expect(generator).toContain('compatibility-scenario.test.tsx')
    expect(generator).toContain('class="discrepancy-list"')
    expect(generator).toContain('class="report-action primary"')
    expect(generator).toContain('target="_blank" rel="noopener">Launch')
    expect(generator).toContain('compatibility-report.json" target="_blank" rel="noopener"')
    expect(generator).toContain('Center point resolves to the same element')
    expect(generator).toContain('class="discrepancy-kind"')
    expect(generator).toContain('class="score score-geometry"')
  })

  it('renders support dimensions, semantic notes, inline code, and summary filters', async () => {
    const page = await readDocumentationSource('docs-engine/css-support-status.template.html')
    const script = [...page.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)]
      .map((match) => match[1])
      .find((source) => source.includes('rankSupportEntries'))
      .replace(
        "import { rankSupportEntries } from './css-support-search.js'",
        'const rankSupportEntries = (entries) => entries',
      )
      .replace(
        "import { highlight as highlightSource } from './site.js'",
        'const highlightSource = (source) => source',
      )
    const record = {
      id: 'variables',
      title: 'CSS variables',
      status: 'partial',
      parityStatus: 'verified',
      effect: 'layout',
      owner: 'css-parser',
      subjects: { properties: ['color'], elements: [] },
      claims: [{
        id: 'current-scope',
        description: 'Resolves `var()` references.',
        support: 'partial',
        parity: { status: 'verified', fixtures: ['variables'] },
        notes: [{ kind: 'limitation', text: 'Resolution of `var()` is not implemented.' }],
      }],
    }

    document.body.innerHTML = `
      <section id="summary"></section>
      <section class="toolbar">
        <input id="search"><select id="status"><option value=""></option><option value="partial"></option></select>
        <select id="effect"><option value=""></option></select>
        <select id="owner"><option value=""></option></select>
        <select id="parityStatus"><option value=""></option></select>
        <button id="clearFilters"></button>
      </section>
      <main>
        <strong id="resultCount"></strong><table><tbody id="rows"></tbody></table>
        <dialog id="fixtureDialog">
          <h2 id="fixtureDialogTitle"></h2><button id="fixtureDialogClose"></button>
          <p id="fixtureDialogStatus"></p><pre id="fixtureDialogSource" hidden><code></code></pre>
          <a id="fixtureDialogGithub"></a><button id="fixtureDialogCopy"></button>
        </dialog>
      </main>
    `
    const fetch = vi.fn(async (input) => String(input).includes('css-support.json')
      ? new Response(JSON.stringify({ records: [record] }))
      : new Response("it('matches Chromium', () => {})"))
    vi.stubGlobal('fetch', fetch)

    window.eval(script)
    await vi.waitFor(() => expect(document.querySelector('#rows').textContent).toContain('CSS variables'))

    expect(document.querySelector('.status-field').textContent).toContain('Implementation support')
    expect(document.querySelector('.parity-verified').textContent).toContain('Supported scope verified')
    expect(document.querySelector('.note-limitation .note-kind').textContent).toBe('Known limitation')
    expect(document.querySelector('.note-text code').textContent).toBe('var()')
    expect(document.querySelector('.claim-description code').textContent).toBe('var()')
    expect(document.querySelector('.fixture-preview').textContent).toContain('variables.test.ts')
    expect(document.querySelector('.fixture-preview svg')).toBeNull()
    expect(document.querySelector('.claim-evidence .claim-label svg')).not.toBeNull()
    expect(document.querySelector('.claim').lastElementChild.classList).toContain('claim-evidence')
    expect(document.querySelector('.title > span').textContent).toBe('CSS variables')
    expect(document.querySelector('.title > span').closest('a')).toBeNull()

    document.querySelector('[data-status="partial"]').click()
    expect(document.querySelector('#status').value).toBe('partial')
    expect(location.search).toBe('?status=partial')

    document.querySelector('[data-fixture="variables"]').click()
    await vi.waitFor(() => expect(document.querySelector('#fixtureDialogSource code').dataset.source).toContain('matches Chromium'))
    expect(document.querySelector('#fixtureDialog').hasAttribute('open')).toBe(true)
    expect(document.querySelector('#fixtureDialogGithub').href).toContain('/variables.test.ts')
    expect(fetch).toHaveBeenCalledWith('./data/parity-sources/variables.test.ts')
  })

  it('renders anchored, filterable changelog releases with sticky context', async () => {
    const page = await readDocumentationSource('scripts/generate-changelog-page.mjs')

    expect(page).toContain('class="current-release" aria-live="polite"')
    expect(page).toContain('data-current-section')
    expect(page).toContain('class="release-anchor"')
    expect(page).toContain('data-change-filter="major"')
    expect(page).toContain('data-change-filter="minor"')
    expect(page).toContain('id="${releaseId(release)}" data-release="${escapeHtml(release)}"')
    expect(page).toContain("if (release === 'Upcoming') return 'upcoming'")
    expect(page).toContain('return `version-${release.toLowerCase()')
  })
})
