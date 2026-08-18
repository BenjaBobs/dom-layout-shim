import { describe, expect, it } from 'vitest'
import { articleLayout, guideLayout, renderMarkdownFragment, renderMarkdownPage } from '../../docs-engine/render-md.mjs'

const renderGuide = (source) => renderMarkdownPage(source, guideLayout)

const guide = `---
title: Test guide
description: Test description
eyebrow: Test eyebrow
---

# Test title

Test introduction.

\`\`\`ts hero
const value = '<button>'
\`\`\`

## First step

Use **Markdown** here.

> Remember this.

## First step

Continue here.
`

describe('Markdown guide rendering', () => {
  it('renders authored Markdown fragments for embedded documentation', () => {
    expect(renderMarkdownFragment('Use `attachLayoutEngine`.')).toContain('<code>attachLayoutEngine</code>')
  })

  it('renders fenced source as a reusable linked code box', () => {
    const rendered = renderMarkdownFragment('```ts title="vitest.config.ts" source="https://example.test/vitest.config.ts" start="12"\nconst value = true\n```')

    expect(rendered).toContain('<figure class="code-box">')
    expect(rendered).toContain('<span class="code-language" aria-hidden="true">TS</span>')
    expect(rendered).toContain('<a href="https://example.test/vitest.config.ts">vitest.config.ts</a>')
    expect(rendered).toContain('<button class="code-copy" type="button" aria-label="Copy code">')
    expect(rendered).toContain('<code data-language="ts" data-start-line="12">const value = true')
  })

  it('lets another page layout reuse parsed Markdown and frontmatter', () => {
    const rendered = renderMarkdownPage(guide, ({ attributes, markdown, tokens }) => ({
      title: attributes.title,
      body: markdown.renderer.render(tokens, markdown.options, {}),
    }))

    expect(rendered.title).toBe('Test guide')
    expect(rendered.body).toContain('<h2>First step</h2>')
  })

  it('renders standalone authored documentation pages', () => {
    const rendered = renderMarkdownPage(guide, articleLayout)

    expect(rendered.title).toBe('Test guide')
    expect(rendered.description).toBe('Test description')
    expect(rendered.body).toContain('<article class="article">')
    expect(rendered.body).toContain('<h1>Test title</h1>')
    expect(rendered.pageStyles).not.toContain('.article a[href^="./examples/"]')
  })

  it('renders metadata, the hero, navigation, and numbered sections', () => {
    const rendered = renderGuide(guide)

    expect(rendered.title).toBe('Test guide')
    expect(rendered.description).toBe('Test description')
    expect(rendered.body).toContain('<p class="eyebrow">Test eyebrow</p>')
    expect(rendered.body).toContain('<h1>Test title</h1>')
    expect(rendered.body).toContain('<a href="#first-step">First step</a>')
    expect(rendered.body).toContain('<a href="#first-step-2">First step</a>')
    expect(rendered.body).toContain('<section id="first-step"><p class="eyebrow">Step 1</p>')
    expect(rendered.body).toContain('<section id="first-step-2"><p class="eyebrow">Step 2</p>')
    expect(rendered.body).toContain('<strong>Markdown</strong>')
    expect(rendered.body).toContain('<blockquote>')
  })

  it('labels code and escapes source HTML', () => {
    const rendered = renderGuide(guide)

    expect(rendered.body).toContain('<code data-language="ts" data-start-line="1">')
    expect(rendered.body).toContain('<figure class="code-box">')
    expect(rendered.body).toContain('&lt;button&gt;')
    expect(rendered.body).not.toContain("const value = '<button>'")
  })

  it('requires guide metadata and structure', () => {
    expect(() => renderGuide('# Missing frontmatter')).toThrow('Guide requires frontmatter')
    expect(() => renderGuide(`---
title: Test guide
description: Test description
eyebrow: Test eyebrow
---

# No sections

Introduction only.
`)).toThrow('Guide requires at least one level-two heading')
  })
})
