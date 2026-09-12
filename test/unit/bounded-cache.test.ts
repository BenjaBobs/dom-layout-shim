import { expect, it } from 'vitest';
import { BoundedCache } from '../../src/css-parity-implementation/bounded-cache.ts';

it('grows when recently evicted inputs are reused', () => {
  const cache = new BoundedCache<number>(4);
  let misses = 0;
  for (let pass = 0; pass < 5; pass += 1) {
    for (let key = 0; key < 6; key += 1) {
      if (cache.get(String(key)) === undefined) {
        misses += 1;
        cache.set(String(key), key);
      }
    }
  }
  expect(misses).toBeLessThan(12);
  for (let key = 0; key < 6; key += 1) {
    expect(cache.get(String(key))).toBe(key);
  }
});

it('does not grow for a stream of unique inputs', () => {
  const cache = new BoundedCache<number>(4);
  for (let key = 0; key < 100; key += 1) cache.set(String(key), key);
  expect(cache.get('95')).toBeUndefined();
  expect(cache.get('96')).toBe(96);
});

it('caps growth even when the working set keeps expanding', () => {
  const cache = new BoundedCache<number>(2, 100, 8);
  for (const count of [3, 6, 12]) {
    for (let pass = 0; pass < 10; pass += 1) {
      for (let key = 0; key < count; key += 1) {
        if (cache.get(String(key)) === undefined) cache.set(String(key), key);
      }
    }
  }
  expect(
    Array.from({ length: 12 }, (_, key) => cache.get(String(key))).filter(
      value => value !== undefined,
    ),
  ).toHaveLength(8);
});

it('ignores oversized inputs and preserves updates without eviction', () => {
  const cache = new BoundedCache<number>(2, 3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('a', 3);
  cache.set('long', 4);
  expect(cache.get('a')).toBe(3);
  expect(cache.get('b')).toBe(2);
  expect(cache.get('long')).toBeUndefined();
});
