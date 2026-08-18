import { afterEach, describe, expect, it, vi } from 'vitest'
import { enhanceCode, enhanceExternalLinks, enhanceNavigation, enhanceScrollspy, highlight, navigate } from '../../docs-engine/assets/site.js'

afterEach(() => {
  document.body.innerHTML = ''
  document.head.querySelector('[data-page-styles]')?.remove()
  history.replaceState({}, '', '/')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('documentation site behavior', () => {
  it('opens and closes the generated mobile navigation', () => {
    document.body.innerHTML = '<nav data-site-nav><button class="site-menu-button" aria-expanded="false"></button><div class="site-nav-links"><a href="./">Guide</a></div></nav>'

    enhanceNavigation()
    document.querySelector('button').click()
    expect(document.querySelector('nav').hasAttribute('data-menu-open')).toBe(true)
    expect(document.querySelector('button').getAttribute('aria-expanded')).toBe('true')

    document.querySelector('.site-nav-links').click()
    expect(document.querySelector('nav').hasAttribute('data-menu-open')).toBe(false)
    expect(document.querySelector('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('depth-colors brackets without treating brackets in strings as pairs', () => {
    const output = highlight("const value = { nested: call([1]), label: '[' }", 'ts')

    expect(output).toContain('<span class="tok-bracket-0">{</span>')
    expect(output).toContain('<span class="tok-bracket-1">(</span>')
    expect(output).toContain('<span class="tok-bracket-2">[</span>')
    expect(output).toContain('<span class="tok-string">&#039;[&#039;</span>')
  })

  it('adds line-numbered highlighted rows and copy behavior to code boxes', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    document.body.innerHTML = '<figure class="code-box"><figcaption><button class="code-copy"><span>Copy</span></button></figcaption><pre><code data-language="ts" data-start-line="8">const one = 1\nconst two = 2\n</code></pre></figure>'

    enhanceCode(document)

    expect(document.querySelector('code').classList).toContain('code-lines')
    expect(document.querySelectorAll('.code-line')).toHaveLength(2)
    expect(document.querySelector('.code-line').innerHTML).toContain('tok-keyword')
    expect(document.querySelectorAll('.line-source')).toHaveLength(2)
    expect([...document.querySelectorAll('.code-line')].map((line) => line.dataset.lineNumber)).toEqual(['8', '9'])

    document.querySelector('.code-copy').click()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('const one = 1\nconst two = 2'))
    await vi.waitFor(() => expect(document.querySelector('.code-copy span').textContent).toBe('Copied'))
  })

  it('preserves disjoint source ranges in one code box', () => {
    document.body.innerHTML = '<figure class="code-box"><pre><code data-language="ts" data-start-line="2" data-line-ranges="2-2,89-90">import value\n__DOCS_CODE_SKIP__\ncall({\n})</code></pre></figure>'

    enhanceCode(document)

    expect([...document.querySelectorAll('.code-line')].map((line) => line.dataset.lineNumber)).toEqual(['2', '89', '90'])
    expect(document.querySelectorAll('.code-skip')).toHaveLength(1)
    expect(document.querySelector('.code-skip').getAttribute('aria-label')).toBe('Source lines omitted')
  })

  it('tracks the current guide section in the table of contents', () => {
    document.body.innerHTML = '<aside data-scrollspy><a href="#one">One</a><a href="#two">Two</a></aside><section id="one"></section><section id="two"></section>'
    document.querySelector('#one').getBoundingClientRect = () => ({ top: -100 })
    document.querySelector('#two').getBoundingClientRect = () => ({ top: 100 })

    enhanceScrollspy()

    expect(document.querySelector('[href="#two"]').getAttribute('aria-current')).toBe('location')
    expect(document.querySelector('[href="#one"]').hasAttribute('aria-current')).toBe(false)
  })

  it('opens external links in a separate tab without exposing the opener', () => {
    document.body.innerHTML = '<a href="./guide">Internal</a><a href="https://example.com">External</a>'

    enhanceExternalLinks(document.body)

    expect(document.querySelector('[href="./guide"]').target).toBe('')
    expect(document.querySelector('[href="https://example.com"]').target).toBe('_blank')
    expect(document.querySelector('[href="https://example.com"]').rel).toBe('noopener noreferrer')
  })

  it('navigates by replacing page content, styles, title, and history', async () => {
    document.head.insertAdjacentHTML('beforeend', '<style data-page-styles>.old { color: red }</style>')
    document.body.innerHTML = '<nav class="site-nav-links"><a href="./">Guide</a><a href="./changelog.html">Changelog</a></nav><div data-page-content><main id="main-content">Guide</main></div>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(`<!doctype html><html><head><title>Changelog</title><style data-page-styles>.new { color: green }</style></head><body><div data-page-content><main id="main-content">Release notes</main></div></body></html>`)))

    await navigate(new URL('/changelog.html', location.href))

    expect(document.title).toBe('Changelog')
    expect(document.querySelector('[data-page-content]').textContent).toContain('Release notes')
    expect(document.querySelector('[data-page-styles]').textContent).toContain('.new')
    expect(location.pathname).toBe('/changelog.html')
    expect(document.querySelector('[href="./changelog.html"]').getAttribute('aria-current')).toBe('page')
  })
})
