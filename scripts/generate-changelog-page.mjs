import { execFileSync } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { insertUpcoming, markUntaggedReleaseUpcoming } from './changelog-source.mjs'
import { readDocumentationContext, renderDocumentationPage } from './docs-page-shell.mjs'

const root = resolve(import.meta.dirname, '..')
const context = await readDocumentationContext(root)
const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
const pendingChangesets = await readPendingChangesets()
const markdown = pendingChangesets.length > 0
  ? insertUpcoming(changelog, pendingChangesets)
  : markUntaggedReleaseUpcoming(changelog, tagExists)
const releases = [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1])
const content = renderMarkdown(markdown, releases)
const outputPath = resolve(root, '.site/changelog.html')
await mkdir(resolve(root, '.site'), { recursive: true })

const output = renderDocumentationPage({
  ...context,
  page: 'changelog.html',
  title: 'DOM Layout Shim changelog',
  description: 'DOM Layout Shim release changelog.',
  body: `<main>
    <h1>dom-layout-shim</h1>
    <div class="changelog-tools">
      <nav class="release-toc" aria-label="Changelog versions"><strong>Releases</strong>${releases.map((release) => `<a href="#${releaseId(release)}">${escapeHtml(release)}</a>`).join('')}</nav>
      <div class="change-filters" role="group" aria-label="Filter changes by release type">
        <button type="button" data-change-filter="all" aria-pressed="true">All</button>
        <button type="button" data-change-filter="major" aria-pressed="false">Major</button>
        <button type="button" data-change-filter="minor" aria-pressed="false">Minor</button>
        <button type="button" data-change-filter="patch" aria-pressed="false">Patch</button>
      </div>
    </div>
    <div class="current-release" aria-live="polite"><a data-current-release href="#${releaseId(releases[0] || 'Changelog')}">${escapeHtml(releases[0] || 'Changelog')}</a><span aria-hidden="true">·</span><strong data-current-section>Overview</strong></div>
    ${content}
  </main>`,
  pageStyles: `
    main { width:min(980px,calc(100% - 40px)); margin:auto; padding:32px 0 80px; } h1 { margin:0 0 24px; font-size:clamp(34px,8vw,44px); letter-spacing:-.035em; } h2 { scroll-margin-top:110px; margin-top:56px; padding-bottom:8px; border-bottom:1px solid var(--line); } h3 { margin:34px 0 14px; color:var(--muted); font-size:15px; letter-spacing:.06em; text-transform:uppercase; }
    .changelog-tools { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:12px 0; border-bottom:1px solid var(--line); } .release-toc { display:flex; flex-wrap:wrap; gap:12px; align-items:center; } .release-toc a { color:var(--muted); } .change-filters { display:flex; gap:6px; } .change-filters button { padding:6px 10px; border:1px solid var(--line); border-radius:7px; background:var(--panel); color:var(--text); } .change-filters button[aria-pressed="true"] { border-color:var(--brand); color:var(--brand); }
    .current-release { position:sticky; top:var(--site-nav-height); z-index:9; display:flex; gap:8px; margin:0 -12px; padding:9px 12px; border-bottom:1px solid var(--line); background:color-mix(in srgb,var(--bg) 95%,transparent); color:var(--muted); backdrop-filter:blur(10px); } .current-release a,.current-release strong { color:var(--text); font-weight:700; } .current-release a { text-decoration-color:var(--brand); text-underline-offset:3px; }
    .release-heading { display:flex; align-items:baseline; justify-content:space-between; gap:16px; } .release-anchor { color:var(--text); text-decoration-color:transparent; text-underline-offset:4px; } .release-anchor:hover { text-decoration-color:var(--brand); } .release-links { display:flex; gap:10px; font-size:13px; font-weight:400; }
    .change { margin:0 0 14px; padding:18px 20px; border:1px solid var(--line); border-radius:10px; background:var(--panel); box-shadow:var(--shadow-panel); } .change h4 { margin:0 0 10px; font-size:17px; line-height:1.4; } .change p:last-child { margin-bottom:0; } .change-link { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.84em; }
    @media (max-width:700px) { .changelog-tools { align-items:flex-start; flex-direction:column; } .release-toc { max-height:80px; overflow:auto; } .release-heading { align-items:flex-start; flex-direction:column; } }
  `,
  inlineModule: `
    const releaseIndicator = document.querySelector('[data-current-release]')
    const sectionIndicator = document.querySelector('[data-current-section]')
    const releaseHeadings = [...document.querySelectorAll('h2[data-release]')]
    const sectionHeadings = [...document.querySelectorAll('h3[data-change-section]')]
    const updateContext = () => {
      const release = [...releaseHeadings].reverse().find((heading) => heading.getBoundingClientRect().top <= 130) || releaseHeadings[0]
      const section = [...sectionHeadings].reverse().find((heading) => heading.getBoundingClientRect().top <= 130 && (!release || heading.compareDocumentPosition(release) & Node.DOCUMENT_POSITION_PRECEDING))
      if (release && releaseIndicator) {
        releaseIndicator.textContent = release.dataset.release
        releaseIndicator.href = '#' + release.id
      }
      if (sectionIndicator) sectionIndicator.textContent = section?.dataset.changeSection || 'Overview'
    }
    addEventListener('scroll', updateContext, { passive: true })
    updateContext()

    for (const button of document.querySelectorAll('[data-change-filter]')) {
      button.addEventListener('click', () => {
        const filter = button.dataset.changeFilter
        for (const candidate of document.querySelectorAll('[data-change-filter]')) candidate.setAttribute('aria-pressed', String(candidate === button))
        for (const change of document.querySelectorAll('.change')) change.hidden = filter !== 'all' && change.dataset.changeType !== filter
      })
    }
  `,
})

if (process.argv.includes('--check')) {
  await writeFile(outputPath, output)
  console.log('Validated and generated .site/changelog.html.')
} else {
  await writeFile(outputPath, output)
  console.log('Generated .site/changelog.html from released and pending changes.')
}

async function readPendingChangesets() {
  const directory = resolve(root, '.changeset')
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md') && file !== 'README.md').sort()

  return Promise.all(files.map(async (file) => {
    const source = await readFile(resolve(directory, file), 'utf8')
    const match = /^---\n([\s\S]*?)\n---\n+([\s\S]*?)\s*$/.exec(source)

    if (!match) {
      throw new Error(`Invalid Changeset frontmatter in .changeset/${file}`)
    }

    const releaseType = /:\s*(major|minor|patch)\s*$/m.exec(match[1])?.[1]
    if (!releaseType) {
      throw new Error(`Missing release type in .changeset/${file}`)
    }

    return { releaseType, body: match[2].trim() }
  }))
}

function tagExists(tag) {
  try {
    return execFileSync('git', ['tag', '--list', tag], { cwd: root, encoding: 'utf8' }).trim() === tag
  } catch {
    return false
  }
}

function renderMarkdown(source, releases) {
  const output = []
  const lines = source.split('\n')
  let paragraph = []
  let inChange = false
  let changeOpen = false
  let changeTitle = []
  let codeLanguage
  let code = []
  let changeType = ''
  let releaseIndex = 0

  const flushParagraph = () => {
    if (paragraph.length > 0) output.push(`<p>${inline(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const openChange = () => {
    if (!inChange || changeOpen) return
    output.push(`<article class="change" data-change-type="${escapeHtml(changeType)}"><h4>${inline(changeTitle.join(' '))}</h4>`)
    changeOpen = true
  }
  const closeChange = () => {
    openChange()
    flushParagraph()
    if (changeOpen) output.push('</article>')
    inChange = false
    changeOpen = false
    changeTitle = []
  }

  for (const line of lines) {
    const fence = /^```(\w*)$/.exec(line.trim())
    if (fence) {
      if (codeLanguage !== undefined) {
        output.push(`<pre><code data-language="${escapeHtml(codeLanguage)}">${escapeHtml(code.join('\n'))}</code></pre>`)
        codeLanguage = undefined
        code = []
      } else {
        openChange()
        flushParagraph()
        codeLanguage = fence[1] || 'text'
      }
      continue
    }
    if (codeLanguage !== undefined) {
      code.push(line)
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      closeChange()
      const level = heading[1].length
      if (level === 2) {
        const release = heading[2]
        const previous = releases[releaseIndex + 1]
        const links = release === 'Upcoming'
          ? '<a href="https://github.com/BenjaBobs/dom-layout-shim/compare/v' + escapeHtml(releases[1] || '') + '...main">Compare with main</a>'
          : `<a href="https://www.npmjs.com/package/dom-layout-shim/v/${escapeHtml(release)}">npm</a><a href="https://github.com/BenjaBobs/dom-layout-shim/releases/tag/v${escapeHtml(release)}">GitHub</a>${previous && previous !== 'Upcoming' ? `<a href="https://github.com/BenjaBobs/dom-layout-shim/compare/v${escapeHtml(previous)}...v${escapeHtml(release)}">Compare</a>` : ''}`
        output.push(`<div class="release-heading"><h2 id="${releaseId(release)}" data-release="${escapeHtml(release)}"><a class="release-anchor" href="#${releaseId(release)}">${inline(release)}</a></h2><span class="release-links">${links}</span></div>`)
        releaseIndex += 1
      } else if (level !== 1) {
        if (level === 3) changeType = heading[2].toLowerCase().startsWith('major') ? 'major' : heading[2].toLowerCase().startsWith('minor') ? 'minor' : heading[2].toLowerCase().startsWith('patch') ? 'patch' : ''
        output.push(`<h${level}${level === 3 ? ` data-change-section="${escapeHtml(heading[2])}"` : ''}>${inline(heading[2])}</h${level}>`)
      }
      continue
    }
    const item = /^-\s+(.+)$/.exec(line)
    if (item) {
      closeChange()
      inChange = true
      changeTitle = [item[1]]
      continue
    }
    if (line.trim() === '') {
      openChange()
      flushParagraph()
      continue
    }
    if (inChange && !changeOpen) {
      changeTitle.push(line.trim())
      continue
    }
    paragraph.push(line.trim())
  }
  closeChange()
  return output.join('\n')
}

function releaseId(release) {
  if (release === 'Upcoming') return 'upcoming'
  return `version-${release.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function inline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\b([0-9a-f]{7,40}):/g, '<a class="change-link" href="https://github.com/BenjaBobs/dom-layout-shim/commit/$1">$1</a>:')
    .replace(/(^|\s)#(\d+)\b/g, '$1<a class="change-link" href="https://github.com/BenjaBobs/dom-layout-shim/pull/$2">#$2</a>')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
