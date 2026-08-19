import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const consumerRoot = join(repositoryRoot, '.tmp', 'package-consumer');
const packageJson = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
);

rmSync(consumerRoot, { recursive: true, force: true });
mkdirSync(consumerRoot, { recursive: true });

runPnpm(['pack', '--pack-destination', consumerRoot], repositoryRoot);
assertGeneratedAssetsExcluded();

const tarballName = `${packageJson.name}-${packageJson.version}.tgz`;
const tarballPath = join(consumerRoot, tarballName);

writeFileSync(
  join(consumerRoot, 'package.json'),
  `${JSON.stringify(
    {
      private: true,
      type: 'module',
      dependencies: {
        [packageJson.name]: `file:./${basename(tarballPath)}`,
        'happy-dom': packageJson.devDependencies['happy-dom'],
        typescript: packageJson.devDependencies.typescript,
      },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(consumerRoot, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2023',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['consumer.ts'],
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(consumerRoot, 'consumer.ts'),
  `import { Window } from 'happy-dom'
import {
  attachLayoutEngine,
  type UnsupportedCssContext,
} from 'dom-layout-shim'

const window = new Window()
const warnings: UnsupportedCssContext[] = []

window.document.body.innerHTML = \`
  <button id="save" style="width:120px; height:40px; transform:perspective(100px)">
    Save
  </button>
\`

await attachLayoutEngine({
  window,
  unsupportedCss: {
    onWarning: (warning) => warnings.push(warning),
  },
})

const button = window.document.querySelector('#save')
if (!button) {
  throw new Error('Expected the consumer fixture button')
}

const rect = button.getBoundingClientRect()
if (rect.width !== 120 || rect.height !== 40) {
  throw new Error(\`Unexpected packaged layout: \${rect.width}x\${rect.height}\`)
}

if (window.document.elementFromPoint(60, 20) !== button) {
  throw new Error('Expected packaged hit testing to find the button')
}

if (warnings.length !== 1 || warnings[0]?.property !== 'transform') {
  throw new Error('Expected the packaged warning callback to report transform')
}
`,
);

runPnpm(['install', '--ignore-workspace'], consumerRoot);
runPnpm(['exec', 'tsc', '--project', 'tsconfig.json'], consumerRoot);
execFileSync(process.execPath, ['consumer.ts'], {
  cwd: consumerRoot,
  stdio: 'inherit',
});

console.log('Packed package passed consumer typecheck and runtime smoke test.');

function assertGeneratedAssetsExcluded() {
  const packManifest = JSON.parse(
    execFileSync('pnpm', ['pack', '--dry-run', '--json'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    }),
  );
  const packedFiles = packManifest.files.map(file => file.path);
  const testFontFiles = packedFiles.filter(
    path =>
      path.startsWith('test/browser-parity/assets/fonts/') ||
      /\.(?:otf|ttf|woff2?)$/i.test(path),
  );

  if (testFontFiles.length > 0) {
    throw new Error(
      `Packed package contains test font assets: ${testFontFiles.join(', ')}`,
    );
  }

  const generatedDocumentation = packedFiles.filter(
    path =>
      path.startsWith('.site/') ||
      path.startsWith('docs/data/') ||
      path.endsWith('.html'),
  );

  if (generatedDocumentation.length > 0) {
    throw new Error(
      `Packed package contains generated documentation: ${generatedDocumentation.join(', ')}`,
    );
  }
}

function runPnpm(args, cwd) {
  execFileSync('pnpm', args, {
    cwd,
    stdio: 'inherit',
  });
}
