import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const crate = resolve(root, 'crates/taffy-wasm');
const generated = resolve(
  root,
  'src/css-parity-implementation/layout/taffy/generated',
);
const destination = resolve(
  root,
  'dist/css-parity-implementation/layout/taffy/generated',
);

if (process.argv.includes('--copy')) {
  await mkdir(destination, { recursive: true });
  await Promise.all(
    ['taffy_wasm.js', 'taffy_wasm_bg.wasm'].map(file =>
      cp(resolve(generated, file), resolve(destination, file)),
    ),
  );
  process.exit();
}

await rm(generated, { recursive: true, force: true });
const result = spawnSync(
  'wasm-pack',
  [
    'build',
    crate,
    '--release',
    '--target',
    'web',
    '--out-dir',
    generated,
    '--out-name',
    'taffy_wasm',
  ],
  { cwd: root, stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
