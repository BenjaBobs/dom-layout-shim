import { rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = resolve(repositoryRoot, 'dist');

if (outputDirectory !== join(repositoryRoot, 'dist')) {
  throw new Error(
    `Refusing to clean unexpected build output: ${outputDirectory}`,
  );
}

rmSync(outputDirectory, { recursive: true, force: true });
