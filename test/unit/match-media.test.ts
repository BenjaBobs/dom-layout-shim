import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { attachLayoutEngine } from '../../src/index.ts';

describe('matchMedia', () => {
  it('directs viewport assignments to setViewport in strict and sloppy code', async () => {
    const window = new Window();
    try {
      const layoutEngine = await attachLayoutEngine({ window });
      for (const key of ['innerWidth', 'innerHeight'] as const) {
        expect(() => {
          window[key] = 123;
        }).toThrow('layoutEngine.setViewport({ width, height })');
        // Function bodies without a strict directive model classic scripts.
        expect(() =>
          new Function('window', `window.${key} = 123`)(window),
        ).toThrow('layoutEngine.setViewport({ width, height })');
      }
      expect(window.innerWidth).toBe(1280);
      expect(window.innerHeight).toBe(720);
      layoutEngine.setViewport({ width: 320, height: 640 });
      expect(window.innerWidth).toBe(320);
      expect(window.innerHeight).toBe(640);
    } finally {
      window.close();
    }
  });

  it('answers dimensions from the configured viewport', async () => {
    const window = new Window({ width: 1024, height: 768 });

    try {
      await attachLayoutEngine({
        window,
        viewport: { width: 320, height: 640 },
      });

      expect(window.matchMedia('(width: 320px)').matches).toBe(true);
      expect(window.matchMedia('(min-width: 20em)').matches).toBe(true);
      expect(window.matchMedia('(max-width: 319px)').matches).toBe(false);
      expect(window.matchMedia('(height >= 640px)').matches).toBe(true);
      expect(window.matchMedia('(640px <= height)').matches).toBe(true);
    } finally {
      window.close();
    }
  });

  it('supports media types, orientation, aspect ratio, and query lists', async () => {
    const window = new Window();

    try {
      await attachLayoutEngine({
        window,
        viewport: { width: 800, height: 600 },
      });

      expect(
        window.matchMedia('screen and (orientation: landscape)').matches,
      ).toBe(true);
      expect(window.matchMedia('screen').matches).toBe(true);
      expect(window.matchMedia('print and (min-width: 1px)').matches).toBe(
        false,
      );
      expect(window.matchMedia('not print and (min-width: 1px)').matches).toBe(
        true,
      );
      expect(window.matchMedia('(aspect-ratio: 4 / 3)').matches).toBe(true);
      expect(
        window.matchMedia('(max-width: 100px), (min-height: 600px)').matches,
      ).toBe(true);
    } finally {
      window.close();
    }
  });

  it('returns false for invalid and unsupported queries', async () => {
    const window = new Window();

    try {
      await attachLayoutEngine({ window });

      expect(window.matchMedia('').matches).toBe(false);
      expect(window.matchMedia('(min-width: nope)').matches).toBe(false);
      expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(
        false,
      );
      expect(window.matchMedia('(min-width: 1px').matches).toBe(false);
    } finally {
      window.close();
    }
  });

  it('returns an event-target-compatible MediaQueryList', async () => {
    const window = new Window();

    try {
      await attachLayoutEngine({ window });

      const result = window.matchMedia('(min-width: 1px)');
      const listener = vi.fn();

      expect(result.media).toBe('(min-width: 1px)');
      expect(result.onchange).toBe(null);
      expect(result).toBeInstanceOf(window.EventTarget);

      result.addListener(listener);
      result.dispatchEvent(new window.Event('change'));
      expect(listener).toHaveBeenCalledOnce();

      result.removeListener(listener);
      result.dispatchEvent(new window.Event('change'));
      expect(listener).toHaveBeenCalledOnce();
    } finally {
      window.close();
    }
  });

  it('uses the latest layout engine for each window', async () => {
    const window = new Window();

    try {
      await attachLayoutEngine({
        window,
        viewport: { width: 300, height: 200 },
      });
      const result = window.matchMedia('(min-width: 500px)');

      expect(result.matches).toBe(false);

      await attachLayoutEngine({
        window,
        viewport: { width: 700, height: 200 },
      });

      expect(result.matches).toBe(true);
    } finally {
      window.close();
    }
  });
});
