export function insertUpcoming(changelog, changesets) {
  const sections = ['major', 'minor', 'patch'].flatMap(releaseType => {
    const matching = changesets.filter(
      changeset => changeset.releaseType === releaseType,
    );
    if (matching.length === 0) return [];

    const title = `${releaseType[0].toUpperCase()}${releaseType.slice(1)} Changes`;
    return [
      `### ${title}`,
      '',
      ...matching.flatMap(({ body }) => [...formatChange(body), '']),
    ];
  });
  const upcoming = [
    '## Upcoming',
    '',
    'Merged to main but not included in the latest package release.',
    '',
    ...sections,
  ]
    .join('\n')
    .trimEnd();

  return changelog.replace(/^(# .+\n)/, `$1\n${upcoming}\n`);
}

export function parseChangesetBody(body) {
  const lines = body.trim().split('\n');
  const separator = lines.findIndex(line => line.trim() === '');

  if (separator < 1) {
    throw new Error(
      'Changeset body requires a title paragraph followed by a blank line and Markdown details',
    );
  }

  const title = lines
    .slice(0, separator)
    .map(line => line.trim())
    .join(' ');
  const details = lines
    .slice(separator + 1)
    .join('\n')
    .trim();

  if (!details) {
    throw new Error('Changeset body requires Markdown details after its title');
  }

  return { title, details };
}

function formatChange(body) {
  const { title, details } = parseChangesetBody(body);
  return [
    `- ${title}`,
    '',
    ...details.split('\n').map(line => (line ? `  ${line}` : '')),
  ];
}

export function markUntaggedReleaseUpcoming(
  changelog,
  { publishedTag, tagExists },
) {
  const version = /^## (\d+\.\d+\.\d+)$/m.exec(changelog)?.[1];
  if (!version) return changelog;

  const tag = `v${version}`;
  const isPublished =
    publishedTag === undefined ? tagExists(tag) : publishedTag === tag;
  if (isPublished) return changelog;

  return changelog.replace(
    `## ${version}`,
    `## Upcoming\n\nPrepared as ${version}, but not published yet.`,
  );
}
