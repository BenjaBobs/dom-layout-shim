export function renderDocumentationPage({
  title,
  description,
  body,
  page = 'index.html',
  version = '',
  upcoming = false,
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
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${renderNavigation({ page, version, upcoming })}
  ${body.trim().replace(/<(main)(\s|>)/, '<$1 id="main-content" tabindex="-1"$2')}${pageScript}
</body>
</html>
`
}

export function renderNavigation({ page, version, upcoming }) {
  const links = [
    ['index.html', './', 'Guide'],
    ['css-support-status.html', './css-support-status.html', 'CSS support'],
    ['changelog.html', './changelog.html', 'Changelog'],
  ]

  return `<nav class="site-nav" data-site-nav aria-label="Main navigation">
    <a class="site-wordmark" href="./">DOM Layout Shim</a>
    <span class="site-context">
      ${version ? `<a class="site-version" href="https://www.npmjs.com/package/dom-layout-shim/v/${escapeAttribute(version)}">Latest v${escapeHtml(version)}</a>` : ''}
      ${upcoming ? '<a class="site-upcoming" href="./changelog.html#upcoming">Unreleased</a>' : ''}
    </span>
    <button class="site-menu-button" type="button" aria-expanded="false" aria-controls="site-navigation-links">Menu</button>
    <div class="site-nav-links" id="site-navigation-links">
      ${links.map(([file, href, label]) => `<a href="${href}"${page === file ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
      <a href="https://github.com/BenjaBobs/dom-layout-shim">GitHub</a>
    </div>
  </nav>`
}

export async function readDocumentationContext(root) {
  const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const changesets = await readdir(resolve(root, '.changeset'))
  return {
    version: packageJson.version,
    upcoming: changesets.some((file) => file.endsWith('.md') && file !== 'README.md'),
  }
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
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
