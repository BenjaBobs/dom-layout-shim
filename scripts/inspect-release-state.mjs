import { appendFileSync, readFileSync } from 'node:fs'
import process from 'node:process'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const packageName = packageJson.name
const version = packageJson.version
const tag = `v${version}`
const currentSha = process.env.GITHUB_SHA ?? ''

if (packageJson.private || version === '0.0.0') {
  writeOutputs({
    package_name: packageName,
    should_publish: false,
    should_release: false,
    should_run: false,
    should_tag: false,
    tag,
    tag_sha: currentSha,
    version,
  })
  process.exit()
}

const encodedPackage = packageName.replace('/', '%2f')
const registryResponse = await fetch(
  `https://registry.npmjs.org/${encodedPackage}/${encodeURIComponent(version)}`,
)

if (registryResponse.status !== 200 && registryResponse.status !== 404) {
  throw new Error(`Could not inspect npm release state: HTTP ${registryResponse.status}`)
}

const shouldPublish = registryResponse.status === 404
const publishedPackage = shouldPublish ? undefined : await registryResponse.json()
const tagSha = publishedPackage?.gitHead ?? currentSha
const repository = process.env.GITHUB_REPOSITORY
const githubToken = process.env.GITHUB_TOKEN

if (!repository || !githubToken) {
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required')
}

const releaseResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  },
)

if (releaseResponse.status !== 200 && releaseResponse.status !== 404) {
  throw new Error(`Could not inspect GitHub release state: HTTP ${releaseResponse.status}`)
}

const shouldRelease = releaseResponse.status === 404
const tagResponse = await fetch(
  `https://api.github.com/repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  },
)

if (tagResponse.status !== 200 && tagResponse.status !== 404) {
  throw new Error(`Could not inspect GitHub tag state: HTTP ${tagResponse.status}`)
}

const shouldTag = tagResponse.status === 404

writeOutputs({
  package_name: packageName,
  should_publish: shouldPublish,
  should_release: shouldRelease,
  should_run: shouldPublish || shouldRelease,
  should_tag: shouldTag,
  tag,
  tag_sha: tagSha,
  version,
})

function writeOutputs(outputs) {
  const outputPath = process.env.GITHUB_OUTPUT

  if (!outputPath) {
    for (const [name, value] of Object.entries(outputs)) {
      console.log(`${name}=${value}`)
    }
    return
  }

  appendFileSync(
    outputPath,
    Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join('\n') + '\n',
  )
}
