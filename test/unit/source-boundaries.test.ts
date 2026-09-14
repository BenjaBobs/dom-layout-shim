import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseSync, Visitor } from 'vite';
import { describe, expect, it } from 'vitest';

describe('source boundaries', () => {
  it('keeps snapshot collection independent of layout and style construction', () => {
    const dependencies = runtimeDependencies(
      'src/css-parity-implementation/layout/collect-layout.ts',
    );
    expect(
      dependencies.filter(path =>
        /taffy|style-resolver|stylesheet-source|apply-declaration|cascade\.ts|inline-formatting|text-lines|attachment/.test(
          path,
        ),
      ),
    ).toEqual([]);
  });

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

  it('derives box metrics only from resolved numeric layout inputs', () => {
    expect(
      runtimeDependencies(
        'src/css-parity-implementation/layout/box-metrics.ts',
      ),
    ).toEqual([]);
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
  it('requires formatting contexts to enter through the complete style resolver', () => {
    const css = resolve('src/css-parity-implementation/css');
    const owners: Record<string, string[]> = {
      'cascade.ts': ['style-resolver.ts'],
      'element-cascade.ts': ['style-resolver.ts'],
      'inherited-style.ts': ['style-resolver.ts'],
      'html-style-defaults.ts': ['style-resolver.ts'],
      'apply-declaration.ts': ['cascade.ts'],
    };
    for (const path of sourceFiles('src')) {
      for (const edge of importsIn(path)) {
        if (!edge.source.startsWith('.')) continue;
        const target = resolve(dirname(path), edge.source);
        if (
          target.startsWith(
            `${resolve('src/css-parity-implementation/layout/taffy/generated')}/`,
          )
        ) {
          expect(
            path,
            'Raw backend access bypasses layout cache ownership',
          ).toBe(
            resolve(
              'src/css-parity-implementation/layout/taffy/taffy-bindings.ts',
            ),
          );
        }
        for (const [module, allowed] of Object.entries(owners)) {
          if (target !== resolve(css, module)) continue;
          expect(
            allowed.map(name => resolve(css, name)),
            `${path} bypasses style resolution via ${edge.source}`,
          ).toContain(path);
        }
        if (
          target === resolve(css, 'supported-style.ts') &&
          (edge.names.includes('createDefaultStyle') ||
            edge.names.includes('*'))
        ) {
          expect(
            path,
            'Only the resolver may initialize a computed style',
          ).toBe(resolve(css, 'style-resolver.ts'));
        }
      }
    }
  });

  it('limits mutable style access to CSS interpretation', () => {
    const css = resolve('src/css-parity-implementation/css');
    const writers = [
      'supported-style.ts',
      'apply-declaration.ts',
      'cascade.ts',
      'inherited-style.ts',
    ].map(name => resolve(css, name));
    for (const path of sourceFiles('src')) {
      if (writers.includes(path)) continue;
      const parsed = parseSync(path, readFileSync(path, 'utf8'));
      new Visitor({
        ImportDeclaration(node) {
          if (
            resolve(dirname(path), node.source.value) !==
            resolve(css, 'supported-style.ts')
          )
            return;
          for (const specifier of node.specifiers) {
            expect(
              specifier.type,
              `${path} must explicitly select read-only style types`,
            ).not.toBe('ImportNamespaceSpecifier');
            if (
              specifier.type === 'ImportSpecifier' &&
              specifier.imported.type === 'Identifier'
            )
              expect(specifier.imported.name, path).not.toBe(
                'MutableSupportedStyle',
              );
          }
        },
        ExportNamedDeclaration(node) {
          if (
            !node.source ||
            resolve(dirname(path), node.source.value) !==
              resolve(css, 'supported-style.ts')
          )
            return;
          for (const specifier of node.specifiers)
            if (specifier.local.type === 'Identifier')
              expect(specifier.local.name, path).not.toBe(
                'MutableSupportedStyle',
              );
        },
        ExportAllDeclaration(node) {
          expect(
            resolve(dirname(path), node.source.value),
            `${path} must not re-export mutable style access`,
          ).not.toBe(resolve(css, 'supported-style.ts'));
        },
      }).visit(parsed.program);
    }
  });

  it('tracks runtime dependencies through aliases, re-exports, and dynamic imports', () => {
    expect(
      runtimeImports(`
      import type { A } from './types.ts';
      import { type B } from './types.ts';
      import { type C, value as alias } from "./values.ts";
      export { alias as other } from './barrel.ts';
      export type { D } from './types.ts';
      export * from './all.ts';
      void import('./lazy.ts');
      require('./common.ts');
    `),
    ).toEqual([
      { source: './values.ts', names: ['value'] },
      { source: './barrel.ts', names: ['alias'] },
      { source: './all.ts', names: ['*'] },
      { source: './lazy.ts', names: ['*'] },
      { source: './common.ts', names: ['*'] },
    ]);
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

type ImportEdge = { source: string; names: string[] };

function runtimeImports(source: string, path = 'source.ts'): ImportEdge[] {
  const parsed = parseSync(path, source);
  expect(parsed.errors).toEqual([]);
  const edges: ImportEdge[] = [];
  new Visitor({
    ImportDeclaration(node) {
      if (node.importKind === 'type') return;
      const values = node.specifiers.filter(
        specifier =>
          specifier.type !== 'ImportSpecifier' ||
          specifier.importKind !== 'type',
      );
      if (node.specifiers.length && !values.length) return;
      edges.push({
        source: node.source.value,
        names: values.map(specifier =>
          specifier.type === 'ImportSpecifier'
            ? specifier.imported.type === 'Identifier'
              ? specifier.imported.name
              : String(specifier.imported.value)
            : '*',
        ),
      });
    },
    ExportNamedDeclaration(node) {
      if (!node.source || node.exportKind === 'type') return;
      const values = node.specifiers.filter(
        specifier => specifier.exportKind !== 'type',
      );
      if (values.length)
        edges.push({
          source: node.source.value,
          names: values.map(specifier =>
            specifier.local.type === 'Identifier'
              ? specifier.local.name
              : String(specifier.local.value),
          ),
        });
    },
    ExportAllDeclaration(node) {
      if (node.exportKind !== 'type')
        edges.push({ source: node.source.value, names: ['*'] });
    },
    ImportExpression(node) {
      if (
        node.source.type === 'Literal' &&
        typeof node.source.value === 'string'
      )
        edges.push({ source: node.source.value, names: ['*'] });
      else
        throw new Error(
          `Non-literal dynamic import prevents boundary analysis: ${path}`,
        );
    },
    CallExpression(node) {
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'require')
        return;
      const argument = node.arguments[0];
      if (argument?.type === 'Literal' && typeof argument.value === 'string')
        edges.push({ source: argument.value, names: ['*'] });
      else
        throw new Error(
          `Non-literal require prevents boundary analysis: ${path}`,
        );
    },
  }).visit(parsed.program);
  return edges;
}

const imports = new Map<string, ImportEdge[]>();
function importsIn(path: string): ImportEdge[] {
  const absolute = resolve(path);
  const cached = imports.get(absolute);
  if (cached) return cached;
  const edges = runtimeImports(readFileSync(absolute, 'utf8'), absolute);
  imports.set(absolute, edges);
  return edges;
}

function runtimeDependencies(
  path: string,
  visited = new Set<string>(),
): string[] {
  for (const edge of importsIn(path)) {
    if (!edge.source.startsWith('.')) continue;
    const dependency = resolve(dirname(resolve(path)), edge.source);
    if (visited.has(dependency)) continue;
    visited.add(dependency);
    runtimeDependencies(dependency, visited);
  }
  return [...visited];
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'generated') return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });
}

function directoriesIn(path: string): string[] {
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}
