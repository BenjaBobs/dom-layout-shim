export function renderDocumentationPage({
  title,
  description,
  body,
  pageStyles = '',
  inlineModule = '',
  scripts = [],
}) {
  const styles = pageStyles
    ? `\n  <style>\n${pageStyles.trim()}\n  </style>`
    : ''
  const externalScripts = scripts.length > 0
    ? `\n  ${scripts.map((source) => `<script type="module" src="${escapeAttribute(source)}"></script>`).join('\n  ')}`
    : ''
  const pageScript = inlineModule
    ? `\n  <script type="module">\n${inlineModule.trim()}\n  </script>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeAttribute(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="./site.css">${styles}
  <script type="module" src="./site.js"></script>${externalScripts}
</head>
<body>
  <nav data-site-nav></nav>
  ${body.trim()}${pageScript}
</body>
</html>
`
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
