import { describe, expect, it } from 'vitest';
import { renderChangelogMarkdown } from '../../scripts/changelog-renderer.mjs';
import {
  insertUpcoming,
  markUntaggedReleaseUpcoming,
  parseChangesetBody,
} from '../../scripts/changelog-source.mjs';

describe('documentation changelog source', () => {
  it('groups pending Changesets under Upcoming', () => {
    const changelog = '# Package\n\n## 1.0.0\n\nReleased.';
    const result = insertUpcoming(changelog, [
      {
        releaseType: 'patch',
        body: 'Fix a mismatch\n\nThe corrected value is `20px`.',
      },
      {
        releaseType: 'minor',
        body: 'Add a public option\n\nUse `mode: true` to enable it.',
      },
    ]);

    expect(result).toContain(
      '## Upcoming\n\nMerged to main but not included in the latest package release.',
    );
    expect(result).toContain(
      '### Minor Changes\n\n- Add a public option\n\n  Use `mode: true` to enable it.',
    );
    expect(result).toContain(
      '### Patch Changes\n\n- Fix a mismatch\n\n  The corrected value is `20px`.',
    );
    expect(result).toContain('## 1.0.0');
  });

  it('requires a title paragraph and Markdown details', () => {
    expect(() => parseChangesetBody('Only a title')).toThrow(
      'requires a title paragraph',
    );
    expect(parseChangesetBody('Concise title\n\nDetailed outcome.')).toEqual({
      title: 'Concise title',
      details: 'Detailed outcome.',
    });
  });

  it('renders change details as useful Markdown below the card title', () => {
    const source = `# Package

## 1.0.0

### Minor Changes

- abc1234: Add structured release notes

  The body supports ordinary Markdown:

  - Lists
  - **Emphasis**

  | Output | Supported |
  | --- | --- |
  | Tables | Yes |
`;
    const rendered = renderChangelogMarkdown(source, ['1.0.0']);

    expect(rendered).toContain(
      '<h4><a class="change-link" href="https://github.com/BenjaBobs/dom-layout-shim/commit/abc1234">abc1234</a>: Add structured release notes</h4>',
    );
    expect(rendered).toContain('<p>The body supports ordinary Markdown:</p>');
    expect(rendered).toContain('<li>Lists</li>');
    expect(rendered).toContain('<strong>Emphasis</strong>');
    expect(rendered).toContain('<table>');
  });

  it('labels a prepared release Upcoming until its tag exists', () => {
    const changelog =
      '# Package\n\n## 1.1.0\n\nPrepared changes.\n\n## 1.0.0\n\nReleased.';

    expect(
      markUntaggedReleaseUpcoming(changelog, {
        tagExists: () => false,
      }),
    ).toContain('## Upcoming\n\nPrepared as 1.1.0, but not published yet.');
    expect(
      markUntaggedReleaseUpcoming(changelog, {
        tagExists: tag => tag === 'v1.1.0',
      }),
    ).toBe(changelog);
  });

  it('uses authoritative workflow release state instead of local tags', () => {
    const changelog = '# Package\n\n## 1.1.0\n\nReleased.';
    const unavailableGitProbe = () => {
      throw new Error('local tags are unavailable');
    };

    expect(
      markUntaggedReleaseUpcoming(changelog, {
        publishedTag: 'v1.1.0',
        tagExists: unavailableGitProbe,
      }),
    ).toBe(changelog);
    expect(
      markUntaggedReleaseUpcoming(changelog, {
        publishedTag: 'v1.0.0',
        tagExists: unavailableGitProbe,
      }),
    ).toContain('## Upcoming\n\nPrepared as 1.1.0, but not published yet.');
  });
});
