export { attachLayoutEngine } from './api/attach-layout-engine.ts'
export type { AttachLayoutEngineOptions } from './api/attach-layout-engine.ts'
export { expectBlockedBy, expectReceivesPointer, guardedClick } from './api/pointer-assertions.ts'
export type { PointerAssertionOptions } from './api/pointer-assertions.ts'
export type { LayoutEngineConfig, Viewport } from './api/layout-engine-config.ts'
export { debugLayout } from './api/debug-layout.ts'
export type {
  UnsupportedCssContext,
  UnsupportedCssDecision,
  UnsupportedCssPolicy,
  UnsupportedCssReason,
  UnsupportedCssSource,
} from './api/unsupported-css-policy.ts'
export { cssSupportInventory, getInventoriedCssProperties, getInventoriedHtmlElements } from './api/css-support-inventory.ts'
export type {
  CssSupportClaim,
  CssSupportEffect,
  CssSupportLevel,
  CssSupportNote,
  CssSupportNoteKind,
  CssSupportOwner,
  CssSupportParity,
  CssSupportRecord,
} from './api/css-support-inventory.ts'
export type { Box } from './api/box.ts'
export type { HitBox } from './api/hit-box.ts'
export {
  createDefaultTextMeasurer,
  createDeterministicTextMeasurer,
  createPretextTextMeasurer,
} from './api/text-measurer.ts'
export type { TextMeasureInput, TextMeasureResult, TextMeasurer } from './api/text-measurer.ts'
