import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveDocumentationRequest } from '../../scripts/serve-css-support-status.mjs';

const fixtureRoot = resolve(process.cwd(), '.tmp/docs-static-server-test');

beforeAll(async () => {
  await mkdir(resolve(fixtureRoot, 'examples/material-ui'), {
    recursive: true,
  });
  await writeFile(resolve(fixtureRoot, 'index.html'), 'Docs');
  await writeFile(
    resolve(fixtureRoot, 'examples/material-ui/index.html'),
    'Material UI',
  );
});

afterAll(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

describe('documentation static server routing', () => {
  it('resolves directory URLs to their index document', () => {
    expect(
      resolveDocumentationRequest(fixtureRoot, '/examples/material-ui/'),
    ).toEqual({
      status: 200,
      filePath: resolve(fixtureRoot, 'examples/material-ui/index.html'),
    });
  });

  it('redirects directory URLs without a trailing slash', () => {
    expect(
      resolveDocumentationRequest(fixtureRoot, '/examples/material-ui'),
    ).toEqual({
      status: 301,
      location: '/examples/material-ui/',
      message: 'Moved permanently',
    });
  });

  it('keeps resolved paths inside the documentation root', () => {
    expect(
      resolveDocumentationRequest(fixtureRoot, '/../package.json'),
    ).toEqual({
      status: 403,
      message: 'Forbidden',
    });
  });
});
