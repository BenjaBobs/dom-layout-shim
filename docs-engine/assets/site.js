document.addEventListener('DOMContentLoaded', () => {
  enhanceNavigation();
  enhanceScrollspy();
  enhanceExternalLinks();
  enhanceCode(document);
  enhancePageNavigation();
});

const pageCache = new Map();

export function enhancePageNavigation() {
  if (!document.querySelector('[data-page-content]')) return;
  history.scrollRestoration = 'manual';
  history.replaceState({ ...(history.state || {}), docsScrollY: scrollY }, '');

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const destination = new URL(link.href, location.href);
    if (link.target || link.download || destination.origin !== location.origin)
      return;
    if (
      destination.pathname === location.pathname &&
      destination.search === location.search
    )
      return;
    if (!isDocumentationPage(destination)) return;

    event.preventDefault();
    navigate(destination).catch(() => location.assign(destination.href));
  });

  addEventListener('popstate', () => {
    navigate(new URL(location.href), {
      updateHistory: false,
      restoreScroll: true,
    }).catch(() => location.reload());
  });
}

export async function navigate(
  destination,
  { updateHistory = true, restoreScroll = false } = {},
) {
  const url = new URL(destination, location.href);
  const source =
    pageCache.get(url.href) ||
    (await fetch(url.href).then(response => {
      if (!response.ok)
        throw new Error(`Navigation failed: ${response.status}`);
      return response.text();
    }));
  pageCache.set(url.href, source);
  const next = new DOMParser().parseFromString(source, 'text/html');
  const nextContent = next.querySelector('[data-page-content]');
  if (!nextContent) throw new Error('Navigation response has no page content');

  if (updateHistory) {
    history.replaceState(
      { ...(history.state || {}), docsScrollY: scrollY },
      '',
    );
    history.pushState({ docsScrollY: 0 }, '', url);
  }

  window.__docsPageAbort?.abort();
  document.title = next.title;
  replacePageStyles(next);
  document.querySelector('[data-page-content]').replaceWith(nextContent);
  updateCurrentNavigation(url);
  enhanceCode(nextContent);
  enhanceScrollspy();
  executePageScript(next);

  const target =
    url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (target) target.scrollIntoView();
  else if (restoreScroll) scrollTo(0, history.state?.docsScrollY || 0);
  else scrollTo(0, 0);
  if (!restoreScroll)
    document.querySelector('#main-content')?.focus({ preventScroll: true });
}

function isDocumentationPage(url) {
  return (
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/css-support-status.html') ||
    url.pathname.endsWith('/changelog.html')
  );
}

function replacePageStyles(next) {
  const current = document.querySelector('[data-page-styles]');
  const replacement = next.querySelector('[data-page-styles]');
  if (current && replacement) current.replaceWith(replacement);
  else if (current) current.remove();
  else if (replacement) document.head.append(replacement);
}

function updateCurrentNavigation(url) {
  const page = url.pathname.split('/').pop() || 'index.html';
  for (const link of document.querySelectorAll('.site-nav-links a')) {
    const linkPage =
      new URL(link.href, location.href).pathname.split('/').pop() ||
      'index.html';
    if (link.origin === location.origin && linkPage === page)
      link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('[data-site-nav]')?.removeAttribute('data-menu-open');
  document
    .querySelector('.site-menu-button')
    ?.setAttribute('aria-expanded', 'false');
}

function executePageScript(next) {
  document.querySelector('script[data-page-script]')?.remove();
  const source = next.querySelector('script[data-page-script]')?.textContent;
  if (!source) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.dataset.pageScript = '';
  script.textContent = source;
  document.body.append(script);
}

export function enhanceCode(root) {
  for (const code of root.querySelectorAll('code[data-language]')) {
    const source = (code.textContent ?? '').replace(/\n$/, '');
    const language = code.dataset.language ?? '';
    const startLine = Number.parseInt(code.dataset.startLine ?? '1', 10) || 1;
    const lineNumbers = expandLineRanges(code.dataset.lineRanges);
    const copiedSource = source.replaceAll(
      '__DOCS_CODE_SKIP__',
      '// … source lines omitted …',
    );
    code.classList.add('code-lines');
    let sourceLineIndex = 0;
    code.innerHTML = source
      .split('\n')
      .map((line, index) => {
        if (line === '__DOCS_CODE_SKIP__')
          return '<span class="code-skip" aria-label="Source lines omitted"><span>⋮</span></span>';
        const lineNumber = lineNumbers[sourceLineIndex] ?? startLine + index;
        sourceLineIndex += 1;
        return `<span class="code-line" data-line-number="${lineNumber}"><span class="line-source">${highlight(line, language) || ' '}</span></span>`;
      })
      .join('');
    const button = code.closest('.code-box')?.querySelector('.code-copy');
    button?.addEventListener(
      'click',
      async () => {
        await copyText(copiedSource);
        button.dataset.copied = '';
        button.querySelector('span').textContent = 'Copied';
        setTimeout(() => {
          delete button.dataset.copied;
          button.querySelector('span').textContent = 'Copy';
        }, 1_500);
      },
      { once: false },
    );
  }
}

function expandLineRanges(value = '') {
  return value.split(',').flatMap(range => {
    const [start, end = start] = range.split('-').map(Number);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start
    )
      return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });
}

async function copyText(source) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(source);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = source;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function enhanceExternalLinks(root = document) {
  const update = scope => {
    const links = scope.matches?.('a[href^="http"]')
      ? [scope]
      : scope.querySelectorAll?.('a[href^="http"]') || [];
    for (const link of links) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  };

  update(root);
  if (root === document && document.body) {
    new MutationObserver(records => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node.nodeType === Node.ELEMENT_NODE) update(node);
    }).observe(document.body, { childList: true, subtree: true });
  }
}

export function enhanceNavigation() {
  const navigation = document.querySelector('[data-site-nav]');
  if (!navigation) return;
  const button = navigation.querySelector('.site-menu-button');
  button?.addEventListener('click', () => {
    const open = navigation.toggleAttribute('data-menu-open');
    button.setAttribute('aria-expanded', String(open));
  });
  navigation.querySelector('.site-nav-links')?.addEventListener('click', () => {
    navigation.removeAttribute('data-menu-open');
    button?.setAttribute('aria-expanded', 'false');
  });
}

export function enhanceScrollspy() {
  window.__docsScrollspyAbort?.abort();
  const scrollspyAbort = new AbortController();
  window.__docsScrollspyAbort = scrollspyAbort;
  for (const navigation of document.querySelectorAll('[data-scrollspy]')) {
    const links = [...navigation.querySelectorAll('a[href^="#"]')];
    const targets = links
      .map(link => document.querySelector(link.hash))
      .filter(Boolean);
    if (targets.length === 0) continue;

    const update = () => {
      const readingLine = Math.min(140, innerHeight / 3);
      const active =
        [...targets]
          .reverse()
          .find(target => target.getBoundingClientRect().top <= readingLine) ||
        targets[0];
      for (const link of links) {
        if (link.hash === `#${active.id}`)
          link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };
    addEventListener('scroll', update, {
      passive: true,
      signal: scrollspyAbort.signal,
    });
    addEventListener('resize', update, { signal: scrollspyAbort.signal });
    update();
  }
}

export function highlight(source, language) {
  const definitions =
    language === 'css'
      ? [
          ['tok-comment', /\/\*[\s\S]*?\*\//g],
          ['tok-property', /[\w-]+(?=\s*:)/g],
          ['tok-number', /#[\da-f]{3,8}\b|\b\d+(?:\.\d+)?(?:px|%|rem|em)?\b/gi],
        ]
      : [
          ['tok-comment', /\/\/[^\n]*|\/\*[\s\S]*?\*\//g],
          ['tok-string', /(['"`])(?:\\.|(?!\1)[\s\S])*\1/g],
          [
            'tok-keyword',
            /\b(?:await|const|let|import|from|new|return|throw|if|else|for|of|async|function|true|false|null|undefined)\b/g,
          ],
          ['tok-number', /\b\d+(?:\.\d+)?\b/g],
        ];
  const tokens = definitions.flatMap(([className, pattern], priority) =>
    Array.from(source.matchAll(pattern), match => ({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      text: match[0],
      className,
      priority,
    })),
  );
  const protectedRanges = tokens.filter(
    token =>
      token.className === 'tok-comment' || token.className === 'tok-string',
  );
  const bracketDepth = new Map();
  let depth = 0;
  for (const match of source.matchAll(/[()[\]{}]/g)) {
    const start = match.index ?? 0;
    if (
      protectedRanges.some(range => start >= range.start && start < range.end)
    )
      continue;
    if (')]}'.includes(match[0])) depth = Math.max(0, depth - 1);
    bracketDepth.set(start, depth % 3);
    if ('([{'.includes(match[0])) depth += 1;
    tokens.push({
      start,
      end: start + 1,
      text: match[0],
      className: `tok-bracket-${bracketDepth.get(start)}`,
      priority: definitions.length,
    });
  }
  tokens.sort(
    (left, right) => left.start - right.start || left.priority - right.priority,
  );

  let cursor = 0;
  let output = '';
  for (const token of tokens) {
    if (token.start < cursor) continue;
    output += escapeHtml(source.slice(cursor, token.start));
    output += `<span class="${token.className}">${escapeHtml(token.text)}</span>`;
    cursor = token.end;
  }
  return output + escapeHtml(source.slice(cursor));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
