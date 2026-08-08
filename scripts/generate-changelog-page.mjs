import { execFileSync } from 'node:child_process'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { insertUpcoming, markUntaggedReleaseUpcoming } from './changelog-source.mjs'
import { renderDocumentationPage } from './docs-page-shell.mjs'

const root = resolve(import.meta.dirname, '..')
const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
const pendingChangesets = await readPendingChangesets()
const markdown = pendingChangesets.length > 0
  ? insertUpcoming(changelog, pendingChangesets)
  : markUntaggedReleaseUpcoming(changelog, tagExists)
const content = renderMarkdown(markdown)
const outputPath = resolve(root, 'docs/changelog.html')

const output = renderDocumentationPage({
  title: 'DOM Layout Shim changelog',
  description: 'DOM Layout Shim release changelog.',
  body: `<main>${content}</main>`,
  pageStyles: `
    :root { color-scheme:light dark; --bg:#f5f7fa; --panel:#fff; --text:#16202a; --muted:#607080; --line:#d9e1e8; --brand:#176b52; --code:#17232b; --code-text:#e7f2ef; --inline:#edf2f5; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
    @media (prefers-color-scheme:dark) { :root { --bg:#0f1519; --panel:#172126; --text:#e7eff2; --muted:#9eacb3; --line:#334149; --brand:#70d6ad; --code:#091014; --inline:#253138; } }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); line-height:1.65; } a { color:var(--brand); }
    main { width:min(980px,calc(100% - 40px)); margin:auto; padding:52px 0 80px; } h1 { margin:0 0 44px; font-size:44px; letter-spacing:-.035em; } h2 { margin-top:56px; padding-bottom:8px; border-bottom:1px solid var(--line); } h3 { margin:34px 0 14px; color:var(--muted); font-size:15px; letter-spacing:.06em; text-transform:uppercase; }
    .change { margin:0 0 14px; padding:18px 20px; border:1px solid var(--line); border-radius:10px; background:var(--panel); } .change h4 { margin:0 0 10px; font-size:17px; line-height:1.4; } .change p:last-child { margin-bottom:0; } .change-link { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.84em; }
    pre { overflow:auto; padding:18px; border:1px solid var(--line); border-radius:9px; background:var(--code); color:var(--code-text); font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; } code { padding:2px 5px; border-radius:5px; background:var(--inline); font:.9em ui-monospace,SFMono-Regular,Menlo,monospace; } pre code { padding:0; background:transparent; }
    .tok-keyword { color:#ff9dca; } .tok-string { color:#a8e6a3; } .tok-comment { color:#84959e; font-style:italic; } .tok-number { color:#ffd580; } .tok-property { color:#8ed9ff; }
  `,
})

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current !== output) {
    console.error('docs/changelog.html is stale. Run node scripts/generate-changelog-page.mjs.')
    process.exitCode = 1
  } else {
    console.log('Generated changelog page is current.')
  }
} else {
  await writeFile(outputPath, output)
  console.log('Generated docs/changelog.html from released and pending changes.')
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

function renderMarkdown(source) {
  const output = []
  const lines = source.split('\n')
  let paragraph = []
  let inChange = false
  let changeOpen = false
  let changeTitle = []
  let codeLanguage
  let code = []

  const flushParagraph = () => {
    if (paragraph.length > 0) output.push(`<p>${inline(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const openChange = () => {
    if (!inChange || changeOpen) return
    output.push(`<article class="change"><h4>${inline(changeTitle.join(' '))}</h4>`)
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
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`)
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
