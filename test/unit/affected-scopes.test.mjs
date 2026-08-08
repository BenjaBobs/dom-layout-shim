import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifyAffectedScopes } from '../../scripts/affected-scopes.mjs'

describe('affected scope classification', () => {
  it('includes the publishable root package in workspace discovery', () => {
    const workspace = readFileSync(resolve('pnpm-workspace.yaml'), 'utf8')

    expect(workspace).toContain("  - '.'")
    expect(workspace).toContain("  - 'examples/*'")
  })

  it('validates classifier changes through unit and documentation checks', () => {
    expect(classifyAffectedScopes(['scripts/affected-scopes.mjs'])).toMatchObject({
      package: true,
      parity: false,
      docs: true,
      release: false,
    })
  })

  it('runs package and parity checks for implementation changes', () => {
    expect(classifyAffectedScopes(['src/api/attach-layout-engine.ts'])).toMatchObject({
      package: true,
      parity: true,
      docs: false,
      release: false,
    })
  })

  it('runs package and parity checks for workspace configuration changes', () => {
    expect(classifyAffectedScopes(['pnpm-workspace.yaml'])).toMatchObject({
      package: true,
      parity: true,
      docs: false,
      release: false,
    })
  })

  it('runs package checks for example changes', () => {
    expect(classifyAffectedScopes(['examples/basic/test/app.test.ts'])).toMatchObject({
      package: true,
      parity: false,
      docs: false,
      release: false,
    })
  })

  it('limits Pages action updates to documentation checks', () => {
    expect(classifyAffectedScopes(['.github/workflows/docs.yml'])).toMatchObject({
      package: false,
      parity: false,
      docs: true,
      release: false,
    })
  })

  it('does not run package tests for release automation changes', () => {
    expect(classifyAffectedScopes(['.github/workflows/release.yml'])).toMatchObject({
      package: false,
      parity: false,
      docs: false,
      release: true,
    })
  })

  it('runs package tests for dependency issue synchronization changes', () => {
    expect(classifyAffectedScopes(['scripts/sync-dependency-update-issues.mjs'])).toMatchObject({
      package: true,
      parity: false,
      docs: false,
      release: true,
    })
  })

  it('limits community documentation changes to documentation checks', () => {
    expect(classifyAffectedScopes(['SECURITY.md'])).toMatchObject({
      package: false,
      parity: false,
      docs: true,
      release: false,
    })
  })

  it('limits documentation page source changes to documentation checks', () => {
    expect(classifyAffectedScopes(['docs/guide.md'])).toMatchObject({
      package: false,
      parity: false,
      docs: true,
      release: false,
    })
  })

  it('keeps deleted legacy documentation sources docs-only', () => {
    expect(classifyAffectedScopes(['docs-src/guide.template.html'])).toMatchObject({
      package: false,
      parity: false,
      docs: true,
      release: false,
    })
  })

  it('regenerates documentation when the changelog changes', () => {
    expect(classifyAffectedScopes(['CHANGELOG.md'])).toMatchObject({
      package: false,
      parity: false,
      docs: true,
      release: true,
    })
  })

  it('regenerates documentation when pending Changesets change', () => {
    expect(classifyAffectedScopes(['.changeset/new-api.md'])).toMatchObject({
      package: false,
      parity: false,
      docs: true,
      release: true,
    })
  })

  it('does not run behavior checks for editor defaults', () => {
    expect(classifyAffectedScopes(['.gitattributes'])).toMatchObject({
      package: false,
      parity: false,
      docs: false,
      release: false,
    })
  })

  it('validates package data and documentation for support inventory changes', () => {
    expect(classifyAffectedScopes(['support/css/flex-layout.json'])).toMatchObject({
      package: true,
      parity: false,
      docs: true,
      release: false,
    })
  })

  it('runs every scope for unknown paths', () => {
    expect(classifyAffectedScopes(['new-root-config.toml'])).toMatchObject({
      package: true,
      parity: true,
      docs: true,
      release: true,
    })
  })

  it('runs every scope for an explicit full validation', () => {
    expect(classifyAffectedScopes([], { forceAll: true })).toMatchObject({
      package: true,
      parity: true,
      docs: true,
      release: true,
    })
  })
})
