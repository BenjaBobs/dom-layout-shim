import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: true });

export function renderChangelogMarkdown(source, releases) {
  const output = [];
  const lines = source.split('\n');
  let prose = [];
  let change;
  let changeType = '';
  let releaseIndex = 0;

  const flushProse = () => {
    if (prose.some(line => line.trim())) {
      output.push(markdown.render(prose.join('\n')));
    }
    prose = [];
  };
  const closeChange = () => {
    if (!change) return;
    const body = change.body.join('\n').trim();
    output.push(
      `<article class="change" data-change-type="${escapeHtml(changeType)}"><h4>${renderInline(change.title)}</h4>${body ? markdown.render(body) : ''}</article>`,
    );
    change = undefined;
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeChange();
      flushProse();
      const level = heading[1].length;

      if (level === 2) {
        const release = heading[2];
        const previous = releases[releaseIndex + 1];
        const links = releaseLinks(release, previous, releases);
        output.push(
          `<div class="release-heading"><h2 id="${releaseId(release)}" data-release="${escapeHtml(release)}"><a class="release-anchor" href="#${releaseId(release)}">${renderInline(release)}</a></h2><span class="release-links">${links}</span></div>`,
        );
        releaseIndex += 1;
      } else if (level === 3) {
        changeType = releaseType(heading[2]);
        output.push(
          `<h3 data-change-section="${escapeHtml(heading[2])}">${renderInline(heading[2])}</h3>`,
        );
      }
      continue;
    }

    const item = /^-\s+(.+)$/.exec(line);
    if (item) {
      closeChange();
      flushProse();
      change = { title: item[1], body: [] };
      continue;
    }

    if (change) {
      change.body.push(line.startsWith('  ') ? line.slice(2) : line);
    } else {
      prose.push(line);
    }
  }

  closeChange();
  flushProse();
  return output.join('\n');
}

function releaseLinks(release, previous, releases) {
  if (release === 'Upcoming') {
    return `<a href="https://github.com/BenjaBobs/dom-layout-shim/compare/v${escapeHtml(releases[1] || '')}...main">Compare with main</a>`;
  }

  return `<a href="https://www.npmjs.com/package/dom-layout-shim/v/${escapeHtml(release)}">npm</a><a href="https://github.com/BenjaBobs/dom-layout-shim/releases/tag/v${escapeHtml(release)}">GitHub</a>${previous && previous !== 'Upcoming' ? `<a href="https://github.com/BenjaBobs/dom-layout-shim/compare/v${escapeHtml(previous)}...v${escapeHtml(release)}">Compare</a>` : ''}`;
}

function releaseType(title) {
  const normalized = title.toLowerCase();
  if (normalized.startsWith('major')) return 'major';
  if (normalized.startsWith('minor')) return 'minor';
  if (normalized.startsWith('patch')) return 'patch';
  return '';
}

function renderInline(value) {
  return markdown
    .renderInline(value)
    .replace(
      /\b([0-9a-f]{7,40}):/g,
      '<a class="change-link" href="https://github.com/BenjaBobs/dom-layout-shim/commit/$1">$1</a>:',
    )
    .replace(
      /(^|\s)#(\d+)\b/g,
      '$1<a class="change-link" href="https://github.com/BenjaBobs/dom-layout-shim/pull/$2">#$2</a>',
    );
}

export function releaseId(release) {
  if (release === 'Upcoming') return 'upcoming';
  return `version-${release
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function escapeHtml(value) {
  return markdown.utils.escapeHtml(String(value));
}
