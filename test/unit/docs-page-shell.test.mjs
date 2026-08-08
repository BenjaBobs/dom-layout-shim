import { describe, expect, it } from 'vitest'
import { renderDocumentationPage } from '../../scripts/docs-page-shell.mjs'

describe('documentation page shell', () => {
  it('renders shared assets and navigation around page content', () => {
    const output = renderDocumentationPage({
      title: 'Example page',
      description: 'Example description',
      body: '<main>Example content</main>',
      pageStyles: 'main { color: red; }',
      page: 'changelog.html',
      version: '1.2.3',
      upcoming: true,
    })

    expect(output.match(/<nav class="site-nav" data-site-nav/g)).toHaveLength(1)
    expect(output).toContain('aria-current="page">Changelog</a>')
    expect(output).toContain('v1.2.3</a>')
    expect(output).toContain('href="./changelog.html#upcoming">Upcoming</a>')
    expect(output).toContain('<a class="skip-link" href="#main-content">Skip to content</a>')
    expect(output).toContain('<main id="main-content" tabindex="-1">')
    expect(output).toContain('<link rel="stylesheet" href="./site.css">')
    expect(output).toContain('<script type="module" src="./site.js"></script>')
    expect(output).toContain('<main id="main-content" tabindex="-1">Example content</main>')
    expect(output).not.toMatch(/^\s+$/m)
  })
})
