import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  attachLayoutEngine,
  createUnsupportedCssReporter,
  mergeUnsupportedCssSummaries,
} from '../../src/index.ts';

describe('unsupported CSS reporter', () => {
  it('accepts a reporter directly and prints authored values and selectors', async () => {
    const window = new Window();
    try {
      const reporter = createUnsupportedCssReporter();
      const onWarning = vi.fn();
      window.document.body.innerHTML =
        '<div style="animation-delay: 0.4s; vertical-align: -0.125em; color: var(--missing)"></div>';
      await attachLayoutEngine({
        window,
        unsupportedCss: { reporter, onWarning },
        stylesheets: [
          'div::marker { width: 20px }',
          'div { animation-duration: 2s, 3s; }',
          '@media (color) { div { width: 10px } }',
        ],
      });
      window.document.body.getBoundingClientRect();
      const entries = reporter.getSummary().declarations;
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            property: 'animation-delay',
            value: '0.4s',
          }),
          expect.objectContaining({
            property: 'animation-duration',
            value: '2s, 3s',
          }),
          expect.objectContaining({
            property: 'vertical-align',
            value: '-0.125em',
          }),
          expect.objectContaining({
            property: 'color',
            value: 'var(--missing)',
          }),
          expect.objectContaining({
            property: 'selector',
            value: 'div::marker',
            selectors: ['div::marker'],
          }),
          expect.objectContaining({
            property: '@media',
            value: '@media (color) { div { width: 10px } }',
          }),
        ]),
      );
      expect(entries.every(entry => !entry.value.includes('{"'))).toBe(true);
      expect(onWarning).toHaveBeenCalledTimes(entries.length);
    } finally {
      window.close();
    }
  });

  it('respects explicit ignore and throw decisions with a reporter', async () => {
    const window = new Window();
    try {
      const reporter = createUnsupportedCssReporter();
      window.document.body.innerHTML =
        '<div style="animation-delay: 1s"></div>';
      await attachLayoutEngine({
        window,
        unsupportedCss: { reporter, default: 'ignore' },
      });
      window.document.body.getBoundingClientRect();
      expect(reporter.getSummary().unsupportedDeclarationCount).toBe(0);
      await attachLayoutEngine({
        window,
        unsupportedCss: {
          reporter,
          properties: { 'animation-delay': 'throw' },
        },
      });
      expect(() => window.document.body.getBoundingClientRect()).toThrow(
        'animation-delay: 1s',
      );
      expect(reporter.getSummary().unsupportedDeclarationCount).toBe(0);
    } finally {
      window.close();
    }
  });

  it('merges serialized summaries with sorted unions and summed occurrences', () => {
    const first = createUnsupportedCssReporter();
    const second = createUnsupportedCssReporter();
    first.onWarning({
      property: 'animation-delay',
      value: '1s',
      reason: 'unknown-property',
      source: 'inline-style',
      selector: '.z',
      defaultDecision: 'warn',
    });
    second.onWarning({
      property: 'animation-delay',
      value: '1s',
      reason: 'unknown-property',
      source: 'stylesheet',
      selector: '.a',
      defaultDecision: 'warn',
    });
    second.onWarning({
      property: 'animation-delay',
      value: '2s',
      reason: 'unknown-property',
      source: 'stylesheet',
      defaultDecision: 'warn',
    });
    const summaries = [first.getSummary(), second.getSummary()];
    const before = JSON.stringify(summaries);
    const merged = mergeUnsupportedCssSummaries(JSON.parse(before));
    expect(merged.unsupportedDeclarationCount).toBe(2);
    expect(merged.declarations[0]).toMatchObject({
      value: '1s',
      occurrences: 2,
      sources: ['inline-style', 'stylesheet'],
      selectors: ['.a', '.z'],
    });
    expect(mergeUnsupportedCssSummaries([...summaries].reverse())).toEqual(
      merged,
    );
    expect(JSON.stringify(summaries)).toBe(before);
    expect(mergeUnsupportedCssSummaries([])).toEqual({
      unsupportedDeclarationCount: 0,
      declarations: [],
    });
  });
});
