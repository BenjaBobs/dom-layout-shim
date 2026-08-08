import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readDocumentationSource = (name) => readFile(resolve(process.cwd(), name), 'utf8')

describe('generated documentation experience', () => {
  it('renders accessible support controls and stable record links', async () => {
    const page = await readDocumentationSource('docs-engine/css-support-status.template.html')

    expect(page).toContain('<label class="visually-hidden" for="search">')
    expect(page).toContain('id="resultCount" aria-live="polite"')
    expect(page).toContain('id="clearFilters"')
    expect(page).toContain('<tr id="${escapeHtml(entry.id)}">')
    expect(page).toContain('href="#${escapeHtml(entry.id)}"')
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
