import { expect, it, vi } from 'vitest';
import { cascadeCustomProperties } from '../../src/css-parity-implementation/css/cascade.ts';
import { collectElementDeclarations } from '../../src/css-parity-implementation/css/element-cascade.ts';
import { createRuleMatchingSession } from '../../src/css-parity-implementation/css/stylesheet-source.ts';

it('retains active selector expansions when stylesheets exceed the shared cache', () => {
  const rules = createRuleMatchingSession(
    Array.from({ length: 600 }, (_, index) => ({
      selector: `:where(.scope-${index}).item`,
      declarations: [{ property: '--matched', value: String(index) }],
      specificity: 10,
      order: index,
    })),
  );
  const first = document.createElement('div');
  const second = document.createElement('div');
  first.className = 'scope-0 item';
  second.className = 'scope-599 item';
  const properties = (element: Element) =>
    cascadeCustomProperties(
      new Map(),
      collectElementDeclarations(element, [], rules),
    );
  // Count the scanner's function checks, independently of native DOM matching.
  // A bounded-cache eviction cycle used to repeat them for every element.
  const match = vi.spyOn(String.prototype, 'match');
  const expansionChecks = () =>
    match.mock.calls.filter(
      ([pattern]) =>
        pattern instanceof RegExp && pattern.source === '^:(?:where|is)\\(',
    ).length;
  try {
    expect(properties(first).get('--matched')).toBe('0');
    expect(expansionChecks()).toBeGreaterThan(0);
    match.mockClear();
    expect(properties(second).get('--matched')).toBe('599');
    expect(expansionChecks()).toBe(0);
    // Expansions are reusable; element match results belong to one layout pass.
    second.className = 'scope-1 item';
    const nextRules = createRuleMatchingSession(rules);
    const next = cascadeCustomProperties(
      new Map(),
      collectElementDeclarations(second, [], nextRules),
    );
    expect(next.get('--matched')).toBe('1');
  } finally {
    match.mockRestore();
  }
});
