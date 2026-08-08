document.addEventListener('DOMContentLoaded', () => {
  renderNavigation()

  for (const code of document.querySelectorAll('code[data-language]')) {
    code.innerHTML = highlight(code.textContent ?? '', code.dataset.language ?? '')
  }
})

export function renderNavigation(page = location.pathname.split('/').pop() || 'index.html') {
  const navigation = document.querySelector('[data-site-nav]')
  if (!navigation) return

  const links = [
    ['index.html', './', 'Guide'],
    ['css-support-status.html', './css-support-status.html', 'CSS support'],
    ['changelog.html', './changelog.html', 'Changelog'],
  ]
  navigation.className = 'site-nav'
  navigation.setAttribute('aria-label', 'Main navigation')
  navigation.innerHTML = `
    <a class="site-wordmark" href="./">DOM Layout Shim</a>
    <div class="site-nav-links">
      ${links.map(([file, href, label]) => `
        <a href="${href}"${page === file ? ' aria-current="page"' : ''}>${label}</a>
      `).join('')}
      <a href="https://github.com/BenjaBobs/dom-layout-shim">GitHub</a>
    </div>
  `
}

export function highlight(source, language) {
  const definitions = language === 'css'
    ? [
        ['tok-comment', /\/\*[\s\S]*?\*\//g],
        ['tok-property', /[\w-]+(?=\s*:)/g],
        ['tok-number', /#[\da-f]{3,8}\b|\b\d+(?:\.\d+)?(?:px|%|rem|em)?\b/gi],
      ]
    : [
        ['tok-comment', /\/\/[^\n]*|\/\*[\s\S]*?\*\//g],
        ['tok-string', /(['"`])(?:\\.|(?!\1)[\s\S])*\1/g],
        ['tok-keyword', /\b(?:await|const|let|import|from|new|return|throw|if|else|for|of|async|function|true|false|null|undefined)\b/g],
        ['tok-number', /\b\d+(?:\.\d+)?\b/g],
      ]
  const tokens = definitions.flatMap(([className, pattern], priority) =>
    Array.from(source.matchAll(pattern), (match) => ({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      text: match[0],
      className,
      priority,
    })),
  )
  const protectedRanges = tokens
    .filter((token) => token.className === 'tok-comment' || token.className === 'tok-string')
  const bracketDepth = new Map()
  let depth = 0
  for (const match of source.matchAll(/[()[\]{}]/g)) {
    const start = match.index ?? 0
    if (protectedRanges.some((range) => start >= range.start && start < range.end)) continue
    if (')]}'.includes(match[0])) depth = Math.max(0, depth - 1)
    bracketDepth.set(start, depth % 3)
    if ('([{'.includes(match[0])) depth += 1
    tokens.push({
      start,
      end: start + 1,
      text: match[0],
      className: `tok-bracket-${bracketDepth.get(start)}`,
      priority: definitions.length,
    })
  }
  tokens.sort((left, right) => left.start - right.start || left.priority - right.priority)

  let cursor = 0
  let output = ''
  for (const token of tokens) {
    if (token.start < cursor) continue
    output += escapeHtml(source.slice(cursor, token.start))
    output += `<span class="${token.className}">${escapeHtml(token.text)}</span>`
    cursor = token.end
  }
  return output + escapeHtml(source.slice(cursor))
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
