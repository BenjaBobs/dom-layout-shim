import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readDocumentationPage = (name) => readFile(resolve(process.cwd(), 'docs', name), 'utf8')

describe('generated documentation experience', () => {
  it('renders accessible support controls and stable record links', async () => {
    const page = await readDocumentationPage('css-support-status.html')

    expect(page).toContain('<label class="visually-hidden" for="search">')
    expect(page).toContain('id="resultCount" aria-live="polite"')
    expect(page).toContain('id="clearFilters"')
    expect(page).toContain('<tr id="${escapeHtml(entry.id)}">')
    expect(page).toContain('href="#${escapeHtml(entry.id)}"')
  })

  it('renders anchored, filterable changelog releases with sticky context', async () => {
    const page = await readDocumentationPage('changelog.html')

    expect(page).toContain('class="current-release" aria-live="polite"')
    expect(page).toContain('data-change-filter="minor"')
    expect(page).toContain('id="upcoming" data-release="Upcoming"')
    expect(page).toContain('id="version-0-2-0" data-release="0.2.0"')
  })
})
