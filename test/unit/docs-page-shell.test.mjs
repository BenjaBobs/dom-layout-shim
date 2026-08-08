import { describe, expect, it } from 'vitest'
import { renderDocumentationPage } from '../../scripts/docs-page-shell.mjs'

describe('documentation page shell', () => {
  it('renders shared assets and navigation around page content', () => {
    const output = renderDocumentationPage({
      title: 'Example page',
      description: 'Example description',
      body: '<main>Example content</main>',
      pageStyles: 'main { color: red; }',
    })

    expect(output.match(/<nav data-site-nav><\/nav>/g)).toHaveLength(1)
    expect(output).toContain('<link rel="stylesheet" href="./site.css">')
    expect(output).toContain('<script type="module" src="./site.js"></script>')
    expect(output).toContain('<main>Example content</main>')
    expect(output).not.toMatch(/^\s+$/m)
  })
})
