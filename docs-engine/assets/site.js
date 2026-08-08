document.addEventListener('DOMContentLoaded', () => {
  enhanceNavigation()
  enhanceScrollspy()
  enhanceExternalLinks()

  for (const code of document.querySelectorAll('code[data-language]')) {
    code.innerHTML = highlight(code.textContent ?? '', code.dataset.language ?? '')
  }
})

export function enhanceExternalLinks(root = document) {
  const update = (scope) => {
    const links = scope.matches?.('a[href^="http"]') ? [scope] : scope.querySelectorAll?.('a[href^="http"]') || []
    for (const link of links) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
  }

  update(root)
  if (root === document && document.body) {
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) update(node)
    }).observe(document.body, { childList: true, subtree: true })
  }
}

export function enhanceNavigation() {
  const navigation = document.querySelector('[data-site-nav]')
  if (!navigation) return
  const button = navigation.querySelector('.site-menu-button')
  button?.addEventListener('click', () => {
    const open = navigation.toggleAttribute('data-menu-open')
    button.setAttribute('aria-expanded', String(open))
  })
  navigation.querySelector('.site-nav-links')?.addEventListener('click', () => {
    navigation.removeAttribute('data-menu-open')
    button?.setAttribute('aria-expanded', 'false')
  })
}

export function enhanceScrollspy() {
  for (const navigation of document.querySelectorAll('[data-scrollspy]')) {
    const links = [...navigation.querySelectorAll('a[href^="#"]')]
    const targets = links.map((link) => document.querySelector(link.hash)).filter(Boolean)
    if (targets.length === 0) continue

    const update = () => {
      const readingLine = Math.min(140, innerHeight / 3)
      const active = [...targets].reverse().find((target) => target.getBoundingClientRect().top <= readingLine) || targets[0]
      for (const link of links) {
        if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location')
        else link.removeAttribute('aria-current')
      }
    }
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    update()
  }
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
