import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({ html: false, linkify: true })
markdown.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index]
  const language = token.info.trim().split(/\s+/)[0] || 'text'
  return `<pre><code data-language="${markdown.utils.escapeHtml(language)}">${markdown.utils.escapeHtml(token.content)}</code></pre>`
}

export function renderMarkdownPage(source, layout) {
  const { attributes, content } = parseFrontmatter(source)
  const tokens = markdown.parse(content, {})
  return layout({ attributes, markdown, tokens })
}

export function renderMarkdownFragment(source) {
  return markdown.render(source)
}

export function guideLayout({ attributes, markdown, tokens }) {
  const firstSection = tokens.findIndex((token) => token.type === 'heading_open' && token.tag === 'h2')
  if (firstSection < 0) throw new Error('Guide requires at least one level-two heading')

  const heroTokens = tokens.slice(0, firstSection)
  const heading = inlineContent(heroTokens, 'h1')
  const introduction = paragraphContent(heroTokens)
  const heroCode = heroTokens.find((token) => token.type === 'fence' && token.info.includes('hero'))
  if (!heading || !introduction || !heroCode) throw new Error('Guide requires a title, introduction, and hero code fence')

  const sections = splitSections(tokens.slice(firstSection))
  const tableOfContents = sections
    .map((section) => `<a href="#${section.id}">${markdown.utils.escapeHtml(section.title)}</a>`)
    .join('')
  const sectionContent = sections.map((section, index) => {
    return `<section id="${section.id}"><p class="eyebrow">Step ${index + 1}</p>${markdown.renderer.render(section.tokens, markdown.options, {})}</section>`
  }).join('\n')

  return {
    title: requiredAttribute(attributes, 'title'),
    description: requiredAttribute(attributes, 'description'),
    pageStyles: guideStyles,
    body: `<main>
    <section class="hero">
      <div><p class="eyebrow">${markdown.utils.escapeHtml(requiredAttribute(attributes, 'eyebrow'))}</p><h1>${markdown.renderer.renderInline(heading.children, markdown.options, {})}</h1><div class="lede">${markdown.renderer.renderInline(introduction.children, markdown.options, {})}</div><div class="actions"><a class="button primary" href="#${sections[0].id}">Get started</a><a class="button" href="./css-support-status.html">Explore CSS support</a></div></div>
      ${markdown.renderer.rules.fence([heroCode], 0)}
    </section>
    <div class="guide" id="guide">
      <aside class="toc" data-scrollspy aria-label="Guide contents"><strong>Guide</strong>${tableOfContents}</aside>
      <article class="content">${sectionContent}</article>
    </div>
    <footer>DOM Layout Shim is an early project. Consult the support inventory before relying on a CSS behavior.</footer>
  </main>`,
  }
}

export function articleLayout({ attributes, markdown, tokens }) {
  return {
    title: requiredAttribute(attributes, 'title'),
    description: requiredAttribute(attributes, 'description'),
    pageStyles: articleStyles,
    body: `<main><article class="article">${markdown.renderer.render(tokens, markdown.options, {})}</article></main>`,
  }
}

function parseFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n+([\s\S]*)$/.exec(source)
  if (!match) throw new Error('Guide requires frontmatter')
  const attributes = Object.fromEntries(match[1].split('\n').map((line) => {
    const separator = line.indexOf(':')
    if (separator < 1) throw new Error(`Invalid guide frontmatter: ${line}`)
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
  }))
  return { attributes, content: match[2] }
}

function splitSections(tokens) {
  const sections = []
  for (let index = 0; index < tokens.length;) {
    if (tokens[index].type !== 'heading_open' || tokens[index].tag !== 'h2') {
      throw new Error('Guide content before the first section must belong to the hero')
    }
    const end = tokens.findIndex((token, tokenIndex) => tokenIndex > index && token.type === 'heading_open' && token.tag === 'h2')
    const sectionTokens = tokens.slice(index, end < 0 ? tokens.length : end)
    const title = sectionTokens[1]?.content
    if (!title) throw new Error('Guide section requires a title')
    sections.push({ id: uniqueSlug(title, sections), title, tokens: sectionTokens })
    index = end < 0 ? tokens.length : end
  }
  return sections
}

function uniqueSlug(value, sections) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
  let candidate = base
  let suffix = 2
  while (sections.some((section) => section.id === candidate)) candidate = `${base}-${suffix++}`
  return candidate
}

function inlineContent(tokens, tag) {
  const opening = tokens.findIndex((token) => token.type === 'heading_open' && token.tag === tag)
  return opening >= 0 ? tokens[opening + 1] : undefined
}

function paragraphContent(tokens) {
  const opening = tokens.findIndex((token) => token.type === 'paragraph_open')
  return opening >= 0 ? tokens[opening + 1] : undefined
}

function requiredAttribute(attributes, name) {
  if (!attributes[name]) throw new Error(`Guide frontmatter requires ${name}`)
  return attributes[name]
}

const guideStyles = `
  main { width:min(1080px,calc(100% - 40px)); margin:auto; padding:64px 0; } .hero { display:grid; grid-template-columns:1.2fr .8fr; gap:52px; align-items:center; padding-bottom:72px; }
  .eyebrow { margin:0 0 10px; color:var(--brand); font-size:13px; font-weight:760; letter-spacing:.08em; text-transform:uppercase; } h1 { margin:0; font-size:clamp(40px,7vw,68px); line-height:1.02; letter-spacing:-.04em; } .lede { max-width:680px; margin:24px 0 0; color:var(--muted); font-size:19px; }
  .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; } .button { padding:9px 15px; border:1px solid var(--line); border-radius:8px; background:var(--panel); color:var(--text); font-weight:700; text-decoration:none; } .button.primary { border-color:var(--brand); background:var(--brand); color:var(--bg); }
  .guide { display:grid; grid-template-columns:220px minmax(0,1fr); gap:48px; } .toc { position:sticky; top:88px; align-self:start; display:grid; gap:7px; padding:18px; border:1px solid var(--line); border-radius:10px; background:var(--panel); box-shadow:var(--shadow-panel); } .toc strong { margin-bottom:4px; } .toc a { padding-left:9px; border-left:2px solid transparent; color:var(--muted); text-decoration:none; } .toc a[aria-current='location'] { border-left-color:var(--brand); color:var(--text); font-weight:700; }
  .content { min-width:0; } .content section { scroll-margin-top:calc(var(--site-nav-height) + 24px); padding-bottom:56px; } .content h2 { margin:0 0 12px; font-size:30px; letter-spacing:-.02em; } .content p { max-width:760px; } .content blockquote { margin:16px 0; padding:1px 18px; border-left:4px solid var(--brand); border-radius:6px; background:var(--soft); }
  pre { margin:18px 0; }
  footer { margin-top:40px; padding-top:24px; border-top:1px solid var(--line); color:var(--muted); font-size:14px; }
  @media (max-width:800px) { .hero,.guide { grid-template-columns:1fr; } .toc { position:static; } main { padding-top:42px; } }
`

const articleStyles = `
  main { width:min(1080px,calc(100% - 40px)); margin:auto; padding:56px 0 80px; }
  .article > h1 { max-width:780px; margin:0 0 18px; font-size:clamp(38px,6vw,60px); line-height:1.05; letter-spacing:-.035em; }
  .article > p:first-of-type { max-width:760px; color:var(--muted); font-size:19px; }
  .article h2 { margin:48px 0 14px; font-size:28px; letter-spacing:-.02em; }
  .article p,.article li { max-width:800px; }
  .article table { width:100%; margin:20px 0; border-collapse:collapse; background:var(--panel); }
  .article th,.article td { padding:11px 12px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  .article th { color:var(--muted); font-size:12px; letter-spacing:.04em; text-transform:uppercase; }
`
