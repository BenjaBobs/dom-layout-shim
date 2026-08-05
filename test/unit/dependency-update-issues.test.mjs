import { describe, expect, it } from 'vitest'
import {
  dependencyIssueMarker,
  dependencyIssueTitle,
  planDependencyIssueChanges,
} from '../../scripts/sync-dependency-update-issues.mjs'

describe('dependency update issue synchronization', () => {
  it('creates one issue for a newly outdated dependency', () => {
    expect(
      planDependencyIssueChanges(
        {
          lightningcss: {
            current: '1.32.0',
            latest: '1.33.0',
          },
        },
        [],
      ),
    ).toEqual([
      {
        type: 'create',
        packageName: 'lightningcss',
        title: 'chore: Update lightningcss from 1.32.0 to 1.33.0',
        body: '<!-- dependency-update:npm:lightningcss -->',
      },
    ])
  })

  it('updates an existing issue when a newer version appears', () => {
    expect(
      planDependencyIssueChanges(
        {
          vitest: {
            current: '4.1.5',
            latest: '4.2.0',
          },
        },
        [
          {
            number: 41,
            title: dependencyIssueTitle('vitest', '4.1.5', '4.1.10'),
            body: dependencyIssueMarker('vitest'),
          },
        ],
      ),
    ).toEqual([
      {
        type: 'update',
        packageName: 'vitest',
        number: 41,
        title: 'chore: Update vitest from 4.1.5 to 4.2.0',
        body: '<!-- dependency-update:npm:vitest -->',
      },
    ])
  })

  it('keeps the oldest issue and closes duplicate trackers', () => {
    const marker = dependencyIssueMarker('@playwright/test')
    const title = dependencyIssueTitle('@playwright/test', '1.59.1', '1.62.1')

    expect(
      planDependencyIssueChanges(
        {
          '@playwright/test': {
            current: '1.59.1',
            latest: '1.62.1',
          },
        },
        [
          { number: 52, title, body: marker },
          { number: 48, title, body: marker },
        ],
      ),
    ).toEqual([
      {
        type: 'close',
        packageName: '@playwright/test',
        number: 52,
        reason: 'duplicate',
      },
    ])
  })

  it('closes trackers for current or removed dependencies', () => {
    expect(
      planDependencyIssueChanges(
        {},
        [
          {
            number: 39,
            title: dependencyIssueTitle('@chenglou/pretext', '0.0.6', '0.0.8'),
            body: dependencyIssueMarker('@chenglou/pretext'),
          },
        ],
      ),
    ).toEqual([
      {
        type: 'close',
        packageName: '@chenglou/pretext',
        number: 39,
        reason: 'resolved',
      },
    ])
  })

  it('ignores unrelated issues with the dependencies label', () => {
    expect(
      planDependencyIssueChanges(
        {},
        [{ number: 10, title: 'Dependency policy', body: 'No tracking marker.' }],
      ),
    ).toEqual([])
  })
})
