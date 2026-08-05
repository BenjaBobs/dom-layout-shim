import { describe, expect, it } from 'vitest'
import { classifyAffectedScopes } from '../../scripts/affected-scopes.mjs'

describe('affected scope classification', () => {
  it('runs package and parity checks for implementation changes', () => {
    expect(classifyAffectedScopes(['src/api/attach-layout-engine.ts'])).toMatchObject({
      package: true,
      parity: true,
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
