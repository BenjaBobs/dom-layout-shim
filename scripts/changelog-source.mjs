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
      ...matching.flatMap(({ body }) => [`- ${body}`, '']),
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

export function markUntaggedReleaseUpcoming(changelog, tagExists) {
  const version = /^## (\d+\.\d+\.\d+)$/m.exec(changelog)?.[1];
  if (!version || tagExists(`v${version}`)) return changelog;

  return changelog.replace(
    `## ${version}`,
    `## Upcoming\n\nPrepared as ${version}, but not published yet.`,
  );
}
