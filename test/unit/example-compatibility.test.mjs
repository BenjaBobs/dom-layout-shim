import { describe, expect, it } from 'vitest';
import { compareCompatibilityRuns } from '../../scripts/example-compatibility-core.mjs';

describe('example compatibility reporting', () => {
  it('treats equivalent computed typography values as matching diagnostics', () => {
    const chromium = {
      checkpoints: [
        {
          id: 'initial',
          label: 'Initial',
          elements: {
            '#text': {
              rect: { x: 0, y: 0, width: 100, height: 22 },
              visible: true,
              centerHit: '#text',
              layoutStyles: {
                'font-size': '14px',
                'font-weight': '400',
                'line-height': '22px',
                'white-space': 'normal',
              },
            },
          },
        },
      ],
    };
    const engine = {
      checkpoints: [
        {
          id: 'initial',
          label: 'Initial',
          elements: {
            '#text': {
              rect: { x: 0, y: 0, width: 99, height: 22 },
              visible: true,
              centerHit: '#text',
              layoutStyles: {
                'font-size': '14px',
                'font-weight': 'normal',
                'line-height': '1.571429',
                'white-space': '',
              },
            },
          },
        },
      ],
    };

    const report = compareCompatibilityRuns(
      'example',
      { id: 'scenario', steps: [] },
      chromium,
      engine,
    );

    expect(report.steps[0].scores.styleInputs).toBe(100);
    expect(report.steps[0].diagnostics.styleInputDifferences).toEqual([]);
  });

  it('records differences as report data without throwing', () => {
    const scenario = { id: 'scenario', steps: [] };
    const chromium = {
      checkpoints: [
        {
          id: 'open',
          label: 'Open dialog',
          elements: {
            '#dialog': {
              rect: { x: 10, y: 20, width: 100, height: 80 },
              visible: true,
              centerHit: '#dialog',
            },
          },
        },
      ],
    };
    const engine = {
      checkpoints: [
        {
          id: 'open',
          label: 'Open dialog',
          elements: {
            '#dialog': {
              rect: { x: 14, y: 20, width: 90, height: 80 },
              visible: true,
              centerHit: '#mask',
            },
          },
        },
      ],
    };

    const report = compareCompatibilityRuns(
      'example',
      scenario,
      chromium,
      engine,
    );

    expect(report.summary.discrepancies).toBe(3);
    expect(report.summary.uniqueDiscrepancies).toBe(3);
    expect(report.steps[0].scores).toEqual({
      coverage: 100,
      geometry: 50,
      visibility: 100,
      hitTesting: 0,
      hitStack: 0,
      styleInputs: 100,
      overall: 50,
    });
    expect(
      report.steps[0].discrepancies.map(({ category }) => category),
    ).toEqual(['geometry', 'geometry', 'hit-testing']);
    expect(report.schemaVersion).toBe(2);
    expect(report.discrepancyGroups).toHaveLength(3);
    expect(report.steps[0].diagnostics.hitStackDifferences).toHaveLength(1);
  });
});
