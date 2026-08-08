import { afterEach, describe, expect, it } from 'vitest'
import { enhanceNavigation, enhanceScrollspy, highlight } from '../../docs-engine/assets/site.js'

afterEach(() => {
  document.body.innerHTML = ''
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

  it('tracks the current guide section in the table of contents', () => {
    document.body.innerHTML = '<aside data-scrollspy><a href="#one">One</a><a href="#two">Two</a></aside><section id="one"></section><section id="two"></section>'
    document.querySelector('#one').getBoundingClientRect = () => ({ top: -100 })
    document.querySelector('#two').getBoundingClientRect = () => ({ top: 100 })

    enhanceScrollspy()

    expect(document.querySelector('[href="#two"]').getAttribute('aria-current')).toBe('location')
    expect(document.querySelector('[href="#one"]').hasAttribute('aria-current')).toBe(false)
  })
})
