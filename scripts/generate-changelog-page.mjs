import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const markdown = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
const content = renderMarkdown(markdown)
const outputPath = resolve(root, 'docs/changelog.html')

const output = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="DOM Layout Shim release changelog.">
  <title>DOM Layout Shim changelog</title>
  <style>
    :root { color-scheme:light dark; --bg:#f5f7fa; --panel:#fff; --text:#16202a; --muted:#607080; --line:#d9e1e8; --brand:#176b52; --code:#17232b; --code-text:#e7f2ef; --inline:#edf2f5; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
    @media (prefers-color-scheme:dark) { :root { --bg:#0f1519; --panel:#172126; --text:#e7eff2; --muted:#9eacb3; --line:#334149; --brand:#70d6ad; --code:#091014; --inline:#253138; } }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); line-height:1.65; } a { color:var(--brand); }
    nav { display:flex; gap:20px; padding:20px max(20px,calc((100% - 820px)/2)); border-bottom:1px solid var(--line); background:var(--panel); } nav a { text-decoration:none; font-weight:700; }
    main { width:min(820px,calc(100% - 40px)); margin:auto; padding:52px 0 80px; } h1 { font-size:44px; letter-spacing:-.035em; } h2 { margin-top:52px; padding-bottom:8px; border-bottom:1px solid var(--line); } h3 { margin-top:30px; color:var(--muted); }
    li { margin:10px 0; } pre { overflow:auto; padding:18px; border:1px solid var(--line); border-radius:9px; background:var(--code); color:var(--code-text); font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; } code { padding:2px 5px; border-radius:5px; background:var(--inline); font:.9em ui-monospace,SFMono-Regular,Menlo,monospace; } pre code { padding:0; background:transparent; }
    .tok-keyword { color:#ff9dca; } .tok-string { color:#a8e6a3; } .tok-comment { color:#84959e; font-style:italic; } .tok-number { color:#ffd580; } .tok-property { color:#8ed9ff; }
  </style>
  <script src="./site.js" defer></script>
</head>
<body>
  <nav><a href="./">Guide</a><a href="./css-support-status.html">CSS support</a><a href="https://github.com/BenjaBobs/dom-layout-shim">GitHub</a></nav>
  <main>${content}</main>
</body>
</html>
`

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
  console.log('Generated docs/changelog.html from CHANGELOG.md.')
}

function renderMarkdown(source) {
  const output = []
  const lines = source.split('\n')
  let paragraph = []
  let inList = false
  let codeLanguage
  let code = []

  const flushParagraph = () => {
    if (paragraph.length > 0) output.push(`<p>${inline(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (inList) output.push('</ul>')
    inList = false
  }

  for (const line of lines) {
    const fence = /^```(\w*)$/.exec(line.trim())
    if (fence) {
      if (codeLanguage !== undefined) {
        output.push(`<pre><code data-language="${escapeHtml(codeLanguage)}">${escapeHtml(code.join('\n'))}</code></pre>`)
        codeLanguage = undefined
        code = []
      } else {
        flushParagraph()
        closeList()
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
      flushParagraph()
      closeList()
      const level = heading[1].length
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }
    const item = /^-\s+(.+)$/.exec(line)
    if (item) {
      flushParagraph()
      if (!inList) output.push('<ul>')
      inList = true
      output.push(`<li>${inline(item[1])}</li>`)
      continue
    }
    if (line.trim() === '') {
      flushParagraph()
      closeList()
      continue
    }
    paragraph.push(line.trim())
  }
  flushParagraph()
  closeList()
  return output.join('\n')
}

function inline(value) {
  return escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
