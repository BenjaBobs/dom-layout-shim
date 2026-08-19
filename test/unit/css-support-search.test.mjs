import { describe, expect, it } from 'vitest';
import { rankSupportEntries } from '../../docs-engine/assets/css-support-search.js';

const entry = (id, title, properties = [], notes = []) => ({
  id,
  title,
  subjects: { properties, elements: [] },
  claims: [
    {
      id: `${id}-claim`,
      parity: { fixtures: [] },
      notes: notes.map(text => ({ kind: 'limitation', text })),
    },
  ],
});

describe('CSS support search ranking', () => {
  it('ranks exact subjects before titles and evidence-only matches', () => {
    const records = [
      entry('related', 'Related layout', [], ['flex is mentioned here']),
      entry('flex-layout', 'Flex layout'),
      entry('display', 'Display model', ['flex']),
    ];

    expect(
      rankSupportEntries(records, 'flex').map(record => record.id),
    ).toEqual(['display', 'flex-layout', 'related']);
  });

  it('uses title order when there is no query', () => {
    const records = [entry('second', 'Z index'), entry('first', 'Display')];
    expect(rankSupportEntries(records, '').map(record => record.id)).toEqual([
      'first',
      'second',
    ]);
  });
});
