import { afterEach, describe, expect, it } from 'vitest'
import { highlight, renderNavigation } from '../../docs/site.js'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('documentation site behavior', () => {
  it('renders one shared navigation and marks the current page', () => {
    document.body.innerHTML = '<nav data-site-nav></nav>'

    renderNavigation('changelog.html')

    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe('Changelog')
    expect([...document.querySelectorAll('.site-nav-links a')].map((link) => link.textContent)).toEqual([
      'Guide',
      'CSS support',
      'Changelog',
      'GitHub',
    ])
  })

  it('depth-colors brackets without treating brackets in strings as pairs', () => {
    const output = highlight("const value = { nested: call([1]), label: '[' }", 'ts')

    expect(output).toContain('<span class="tok-bracket-0">{</span>')
    expect(output).toContain('<span class="tok-bracket-1">(</span>')
    expect(output).toContain('<span class="tok-bracket-2">[</span>')
    expect(output).toContain('<span class="tok-string">&#039;[&#039;</span>')
  })
})
