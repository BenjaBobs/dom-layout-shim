import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('source boundaries', () => {
  it('keeps source files inside the API and implementation areas', () => {
    const entries = readdirSync(resolve('src'), { withFileTypes: true })
      .map(entry => entry.name)
      .sort();

    expect(entries).toEqual(['api', 'css-parity-implementation', 'index.ts']);
  });

  it('keeps DOM glue in the API and CSS parity algorithms separate', () => {
    const apiDirectories = directoriesIn('src/api');
    const parityDirectories = directoriesIn('src/css-parity-implementation');

    expect(apiDirectories).toEqual(['attachment', 'browser-dom']);
    expect(parityDirectories).toEqual([
      'css',
      'geometry',
      'hit-testing',
      'layout',
    ]);
  });

  it('exports the package surface through API modules', () => {
    const source = readFileSync(resolve('src/index.ts'), 'utf8');
    const localExportSources = Array.from(
      source.matchAll(/from '([^']+)'/g),
      match => match[1],
    );

    expect(localExportSources.length).toBeGreaterThan(0);
    expect(localExportSources.every(path => path.startsWith('./api/'))).toBe(
      true,
    );
  });
});

function directoriesIn(path: string): string[] {
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}
