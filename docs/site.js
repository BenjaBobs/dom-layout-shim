document.addEventListener('DOMContentLoaded', () => {
  for (const code of document.querySelectorAll('code[data-language]')) {
    code.innerHTML = highlight(code.textContent ?? '', code.dataset.language ?? '')
  }
})

function highlight(source, language) {
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
  ).sort((left, right) => left.start - right.start || left.priority - right.priority)

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
