import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// GitHub Pages serves static files: discovery must work in the initial HTML,
// without JavaScript, user-agent sniffing, or server content negotiation.
export async function generateAgentDocs(root, siteRoot, examples) {
  const read = path => readFile(resolve(root, path), 'utf8');
  const write = (path, content) => writeFile(resolve(siteRoot, path), content);
  await write('llms.txt', await read('docs/llms.txt'));
  await write('index.md', await read('docs/llms.txt'));
  await write('guide.md', stripFrontmatter(await read('docs/guide.md')));
  const findings = examples
    .map(
      ({ example, profile, report, setupMarkdown }) =>
        `## ${profile.library}\n\nOverall agreement: ${report.summary.overallAgreement}%. Coverage: ${report.summary.coverage}%.\nMeasured with Chromium ${report.metadata.chromiumVersion} at ${report.metadata.viewport.width} × ${report.metadata.viewport.height}.\n\n[Full checkpoint results and discrepancies](./examples/${example}/compatibility-report.json)\n\n${setupMarkdown.replaceAll('__DOCS_CODE_SKIP__', '// … source lines omitted …')}`,
    )
    .join('\n\n');
  await write(
    'examples.md',
    stripFrontmatter(await read('docs/examples.md')).replace(
      '{{compatibility-findings}}',
      findings,
    ),
  );

  const { records } = JSON.parse(await read('.site/data/css-support.json'));
  await rm(resolve(siteRoot, 'css'), { recursive: true, force: true });
  await mkdir(resolve(siteRoot, 'css'), { recursive: true });
  const rows = [];
  for (const record of records) {
    rows.push(
      `- [${record.title}](./css/${record.id}.md): support ${record.status}; parity ${record.parityStatus}. Subjects: ${[...record.subjects.properties, ...record.subjects.elements].join(', ')}.`,
    );
    // Preserve every claim field (including conditions and limitations) instead
    // of allowing a compact topic summary to overstate supported CSS.
    await write(
      `css/${record.id}.md`,
      `# ${record.title}\n\n[CSS topic index](../css-support-status.md)\n\nSupport: ${record.status}. Parity: ${record.parityStatus}.\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`,
    );
  }
  await write(
    'css-support-status.md',
    `# CSS support\n\nFind a property or element below, then fetch only its topic file for exact claims, syntax, conditions, limitations, and parity fixture names. Verified parity applies to the supported scope, not every value of a property.\n\n[Property-to-topic index (JSON)](./data/css-property-index.json) · [Full inventory (JSON)](./data/css-support.json)\n\nParity test sources are available at ./data/parity-sources/{fixture}.test.ts.\n\n${rows.join('\n')}\n`,
  );
}

function stripFrontmatter(source) {
  return source.replace(/^---\n[\s\S]*?\n---\n\s*/, '');
}
