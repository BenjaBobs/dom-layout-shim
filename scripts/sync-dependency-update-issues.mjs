import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const issueLabel = 'dependencies'
const markerPattern = /^<!-- dependency-update:npm:(.+) -->$/m

export function dependencyIssueMarker(packageName) {
  return `<!-- dependency-update:npm:${packageName} -->`
}

export function dependencyIssueTitle(packageName, current, latest) {
  return `chore: Update ${packageName} from ${current} to ${latest}`
}

export function planDependencyIssueChanges(outdatedDependencies, openIssues) {
  const changes = []
  const trackedIssues = new Map()

  for (const issue of openIssues) {
    const packageName = readTrackedPackage(issue.body)

    if (!packageName) {
      continue
    }

    const issues = trackedIssues.get(packageName) ?? []
    issues.push(issue)
    trackedIssues.set(packageName, issues)
  }

  for (const [packageName, update] of Object.entries(outdatedDependencies).toSorted()) {
    if (!isVersionUpdate(update)) {
      throw new Error(`Invalid pnpm outdated result for ${packageName}`)
    }

    const title = dependencyIssueTitle(packageName, update.current, update.latest)
    const body = dependencyIssueMarker(packageName)
    const issues = (trackedIssues.get(packageName) ?? []).toSorted((a, b) => a.number - b.number)
    const [keptIssue, ...duplicates] = issues

    if (!keptIssue) {
      changes.push({ type: 'create', packageName, title, body })
    } else if (keptIssue.title !== title || keptIssue.body !== body) {
      changes.push({
        type: 'update',
        packageName,
        number: keptIssue.number,
        title,
        body,
      })
    }

    for (const duplicate of duplicates) {
      changes.push({
        type: 'close',
        packageName,
        number: duplicate.number,
        reason: 'duplicate',
      })
    }

    trackedIssues.delete(packageName)
  }

  for (const [packageName, issues] of trackedIssues) {
    for (const issue of issues) {
      changes.push({
        type: 'close',
        packageName,
        number: issue.number,
        reason: 'resolved',
      })
    }
  }

  return changes
}

function readTrackedPackage(body) {
  return typeof body === 'string' ? body.match(markerPattern)?.[1] : undefined
}

function isVersionUpdate(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.current === 'string' &&
    typeof value.latest === 'string'
  )
}

function readOutdatedDependencies() {
  try {
    return parseOutdatedOutput(execFileSync('pnpm', ['outdated', '--format', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }))
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 1 &&
      'stdout' in error
    ) {
      return parseOutdatedOutput(String(error.stdout))
    }

    throw error
  }
}

function parseOutdatedOutput(output) {
  return output.trim() ? JSON.parse(output) : {}
}

async function listOpenDependencyIssues(repository, token) {
  const issues = []

  for (let page = 1; ; page += 1) {
    const response = await githubRequest(
      `https://api.github.com/repos/${repository}/issues?state=open&labels=${issueLabel}&per_page=100&page=${page}`,
      token,
    )
    const pageIssues = await response.json()

    issues.push(...pageIssues.filter((issue) => !issue.pull_request))

    if (pageIssues.length < 100) {
      return issues
    }
  }
}

async function applyChanges(repository, token, changes) {
  for (const change of changes) {
    switch (change.type) {
      case 'create':
        await githubRequest(`https://api.github.com/repos/${repository}/issues`, token, {
          method: 'POST',
          body: JSON.stringify({
            title: change.title,
            body: change.body,
            labels: [issueLabel],
          }),
        })
        console.log(`Created dependency issue for ${change.packageName}`)
        break
      case 'update':
        await githubRequest(
          `https://api.github.com/repos/${repository}/issues/${change.number}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify({
              title: change.title,
              body: change.body,
            }),
          },
        )
        console.log(`Updated dependency issue #${change.number} for ${change.packageName}`)
        break
      case 'close':
        await githubRequest(
          `https://api.github.com/repos/${repository}/issues/${change.number}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify({
              state: 'closed',
              state_reason: change.reason === 'duplicate' ? 'not_planned' : 'completed',
            }),
          },
        )
        console.log(
          `Closed ${change.reason} dependency issue #${change.number} for ${change.packageName}`,
        )
        break
    }
  }
}

async function githubRequest(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${await response.text()}`)
  }

  return response
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY
  const token = process.env.GITHUB_TOKEN

  if (!repository || !token) {
    throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required')
  }

  const outdatedDependencies = readOutdatedDependencies()
  const openIssues = await listOpenDependencyIssues(repository, token)
  const changes = planDependencyIssueChanges(outdatedDependencies, openIssues)

  if (changes.length === 0) {
    console.log('Dependency update issues are already synchronized.')
    return
  }

  await applyChanges(repository, token, changes)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
