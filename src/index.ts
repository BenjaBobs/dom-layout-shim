export { attachLayoutEngine } from './api/attach-layout-engine.ts'
export type { AttachLayoutEngineOptions, LayoutEngineAttachment } from './api/attach-layout-engine.ts'
export { expectBlockedBy, expectReceivesPointer, guardedClick } from './api/pointer-assertions.ts'
export type { PointerAssertionOptions } from './api/pointer-assertions.ts'
export type {
  LayoutEngineConfig,
  UserAgentStyleOptions,
  UserAgentStyleProfile,
  Viewport,
} from './api/layout-engine-config.ts'
export type {
  NativeControlMetrics,
  NativeControlOptions,
  NativeControlOverrides,
  NativeControlProfile,
} from './api/native-control-profile.ts'
export { debugLayout } from './api/debug-layout.ts'
export type {
  UnsupportedCssContext,
  UnsupportedCssDecision,
  UnsupportedCssPolicy,
  UnsupportedCssReason,
  UnsupportedCssSource,
} from './api/unsupported-css-policy.ts'
export { createUnsupportedCssReporter } from './api/unsupported-css-reporter.ts'
export type {
  UnsupportedCssReporter,
  UnsupportedCssSummary,
  UnsupportedCssSummaryEntry,
} from './api/unsupported-css-reporter.ts'
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
} from './api/text-measurer.ts'
export type { TextMeasureInput, TextMeasureResult, TextMeasurer } from './api/text-measurer.ts'
