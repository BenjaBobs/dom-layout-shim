import { describe, expect, it } from 'vitest'
import { insertUpcoming, markUntaggedReleaseUpcoming } from '../../scripts/changelog-source.mjs'

describe('documentation changelog source', () => {
  it('groups pending Changesets under Upcoming', () => {
    const changelog = '# Package\n\n## 1.0.0\n\nReleased.'
    const result = insertUpcoming(changelog, [
      { releaseType: 'patch', body: 'Fix a mismatch.' },
      { releaseType: 'minor', body: 'Add a public option.' },
    ])

    expect(result).toContain('## Upcoming\n\nMerged to main but not included in the latest package release.')
    expect(result).toContain('### Minor Changes\n\n- Add a public option.')
    expect(result).toContain('### Patch Changes\n\n- Fix a mismatch.')
    expect(result).toContain('## 1.0.0')
  })

  it('labels a prepared release Upcoming until its tag exists', () => {
    const changelog = '# Package\n\n## 1.1.0\n\nPrepared changes.\n\n## 1.0.0\n\nReleased.'

    expect(markUntaggedReleaseUpcoming(changelog, () => false)).toContain(
      '## Upcoming\n\nPrepared as 1.1.0, but not published yet.',
    )
    expect(markUntaggedReleaseUpcoming(changelog, (tag) => tag === 'v1.1.0')).toBe(changelog)
  })
})
