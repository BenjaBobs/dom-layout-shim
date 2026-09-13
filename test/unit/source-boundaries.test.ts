import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('source boundaries', () => {
  it('keeps visual projection independent of the backend and CSS resolution', () => {
    const dependencies = runtimeDependencies(
      'src/css-parity-implementation/layout/project-layout.ts',
    );
    expect(
      dependencies.some(path =>
        /taffy|stylesheet-source|apply-declaration|cascade\.ts|attachment/.test(
          path,
        ),
      ),
    ).toBe(false);
  });

  it('keeps shared line breaking independent of DOM and backend layout', () => {
    expect(
      runtimeDependencies('src/css-parity-implementation/layout/text-lines.ts'),
    ).toEqual([]);
  });

  it('keeps declaration interpretation independent of source selection', () => {
    const dependencies = runtimeDependencies(
      'src/css-parity-implementation/css/cascade.ts',
    );
    expect(
      dependencies.some(path =>
        /stylesheet-source|inline-style-source|element-cascade|taffy|attachment/.test(
          path,
        ),
      ),
    ).toBe(false);
  });
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

function runtimeDependencies(
  path: string,
  visited = new Set<string>(),
): string[] {
  const source = readFileSync(resolve(path), 'utf8');
  for (const match of source.matchAll(
    /import\s+(?!type\b)([\s\S]*?)\s+from\s+'([^']+)'/g,
  )) {
    const target = match[2];
    if (!target.startsWith('.')) continue;
    const dependency = resolve(dirname(resolve(path)), target);
    if (visited.has(dependency)) continue;
    visited.add(dependency);
    runtimeDependencies(dependency, visited);
  }
  return [...visited];
}

function directoriesIn(path: string): string[] {
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}
