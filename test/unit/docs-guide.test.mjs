import { describe, expect, it } from 'vitest'
import { renderGuide } from '../../docs-engine/render-guide.mjs'

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

    expect(rendered.body).toContain('<code data-language="ts">')
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
