export type CssSupportEffect =
  | 'layout'
  | 'hit-testing'
  | 'accepted-inert'
  | 'visual-ignored'
  | 'source'

export type CssSupportOwner = 'css-parser' | 'taffy-adapter' | 'hit-testing' | 'text' | 'dom-api'

export type CssSupportLevel = 'supported' | 'partial' | 'unsupported' | 'unknown'

export type CssSupportParity =
  | 'verified'
  | 'partially-verified'
  | 'unverified'
  | 'known-mismatch'
  | 'not-applicable'

export type CssSupportNoteKind =
  | 'browser-parity'
  | 'behavior-quirk'
  | 'implementation-quirk'
  | 'taffy-compat'
  | 'limitation'
  | 'todo'

export type CssSupportNote = {
  kind: CssSupportNoteKind
  text: string
}

export type CssSupportClaim = {
  id: string
  description?: string
  properties?: readonly string[]
  syntax?: readonly string[]
  conditions?: readonly string[]
  support: CssSupportLevel
  parity: {
    status: CssSupportParity
    fixtures: readonly string[]
  }
  notes: readonly CssSupportNote[]
}

export type CssSupportRecord = {
  $schema?: string
  schemaVersion: 1
  id: string
  title: string
  subjects: {
    properties: readonly string[]
    elements: readonly string[]
  }
  effect: CssSupportEffect
  owner: CssSupportOwner
  claims: readonly CssSupportClaim[]
  source: string
  status: CssSupportLevel
  parityStatus: CssSupportParity
}

export { cssSupportInventory } from './css-support-inventory.generated.ts'

import { cssSupportInventory } from './css-support-inventory.generated.ts'

export function getInventoriedCssProperties(): string[] {
  return [...new Set(cssSupportInventory.flatMap((record) => record.subjects.properties))].sort()
}

export function getInventoriedHtmlElements(): string[] {
  return [...new Set(cssSupportInventory.flatMap((record) => record.subjects.elements))].sort()
}
