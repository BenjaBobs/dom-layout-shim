import { describe, expect, it } from 'vitest';
import {
  parseLengthPercentage,
  parseNumberCalculation,
} from '../../src/css-parity-implementation/css/length-value.ts';

describe('CSS length calculations', () => {
  const context = {
    fontSize: 20,
    rootFontSize: 16,
    viewport: { width: 1000, height: 800 },
  };

  it('resolves viewport and font-relative units to pixels', () => {
    expect(parseLengthPercentage('100vh', context)).toBe(800);
    expect(parseLengthPercentage('2em', context)).toBe(40);
    expect(parseLengthPercentage('2rem', context)).toBe(32);
    expect(parseLengthPercentage('10vmin', context)).toBe(80);
  });

  it('evaluates nested calculations when they reduce to one supported dimension', () => {
    expect(parseLengthPercentage('calc(100vw - calc(16px * 2))', context)).toBe(
      968,
    );
    expect(
      parseLengthPercentage('calc((1.5 * 16px + 16px * 2) - 32px)', context),
    ).toBe(24);
    expect(parseLengthPercentage('calc(50% - 2px)', context)).toEqual({
      percentage: 50,
      length: -2,
    });
  });

  it('evaluates unitless calculations independently from lengths', () => {
    expect(parseNumberCalculation('calc(1000 + 10)')).toBe(1010);
    expect(parseNumberCalculation('calc(10px / 2)')).toBeUndefined();
  });
});
