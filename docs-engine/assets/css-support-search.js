export function rankSupportEntries(entries, query) {
  return [...entries].sort((left, right) =>
    query
      ? relevanceScore(right, query) - relevanceScore(left, query) ||
        left.title.localeCompare(right.title)
      : left.title.localeCompare(right.title),
  );
}

export function relevanceScore(entry, query) {
  const normalized = value => String(value).toLowerCase();
  const exact = values => values.some(value => normalized(value) === query);
  const starts = values =>
    values.some(value => normalized(value).startsWith(query));
  const includes = values =>
    values.some(value => normalized(value).includes(query));
  const primary = [
    entry.id,
    entry.title,
    ...(entry.subjects.properties || []),
    ...(entry.subjects.elements || []),
  ];
  const evidence = entry.claims.flatMap(claim => [
    claim.id,
    ...(claim.properties || []),
    ...(claim.syntax || []),
    ...(claim.conditions || []),
    ...claim.parity.fixtures,
    ...claim.notes.flatMap(note => [note.kind, note.text]),
  ]);

  if (
    exact([
      entry.id,
      ...(entry.subjects.properties || []),
      ...(entry.subjects.elements || []),
    ])
  )
    return 100;
  if (exact([entry.title])) return 90;
  if (starts(primary)) return 70;
  if (includes(primary)) return 50;
  if (includes(evidence)) return 20;
  return 0;
}
