import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { renderDocumentationPage } from '../../scripts/docs-page-shell.mjs';
import { generateAgentDocs } from '../../scripts/generate-agent-docs.mjs';

it('publishes discoverable text pages and lossless CSS topics under a project path', async () => {
  const output = await mkdtemp(resolve('.tmp/agent-docs-'));
  try {
    await generateAgentDocs(process.cwd(), output, []);
    for (const page of ['index', 'examples', 'css-support-status']) {
      const html = renderDocumentationPage({
        title: page,
        description: page,
        page: `${page}.html`,
        body: '<main>Content</main>',
      });
      const template = document.createElement('template');
      template.innerHTML = html;
      const parsed = template.content;
      const alternate = parsed.querySelector('link[rel="alternate"]');
      expect(alternate.type).toBe('text/markdown');
      const url = new URL(
        alternate.getAttribute('href'),
        `https://example.com/dom-layout-shim/${page}.html`,
      );
      expect(url.pathname).toBe(`/dom-layout-shim/${page}.md`);
      expect(
        await readFile(resolve(output, `${page}.md`), 'utf8'),
      ).not.toContain('{{');
      expect(parsed.querySelector('a[href="./llms.txt"]')).not.toBeNull();
    }
    const guide = await readFile(resolve(output, 'llms.txt'), 'utf8');
    expect(guide).toBe(await readFile('docs/llms.txt', 'utf8'));
    const index = await readFile(
      resolve(output, 'css-support-status.md'),
      'utf8',
    );
    const inventory = JSON.parse(
      await readFile('.site/data/css-support.json', 'utf8'),
    );
    for (const record of inventory.records) {
      expect(index).toContain(`./css/${record.id}.md`);
      const topic = await readFile(
        resolve(output, `css/${record.id}.md`),
        'utf8',
      );
      expect(JSON.parse(/```json\n([\s\S]+)\n```/.exec(topic)[1])).toEqual(
        record,
      );
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
