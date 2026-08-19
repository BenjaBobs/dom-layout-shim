export type {
  AttachLayoutEngineOptions,
  LayoutEngineAttachment,
} from './api/attach-layout-engine.ts';
export { attachLayoutEngine } from './api/attach-layout-engine.ts';
export type { Box } from './api/box.ts';
export type {
  CssSupportClaim,
  CssSupportEffect,
  CssSupportLevel,
  CssSupportNote,
  CssSupportNoteKind,
  CssSupportOwner,
  CssSupportParity,
  CssSupportRecord,
} from './api/css-support-inventory.ts';
export {
  cssSupportInventory,
  getInventoriedCssProperties,
  getInventoriedHtmlElements,
} from './api/css-support-inventory.ts';
export { debugLayout } from './api/debug-layout.ts';
export type { HitBox } from './api/hit-box.ts';
export type {
  LayoutEngineConfig,
  UserAgentStyleOptions,
  UserAgentStyleProfile,
  Viewport,
} from './api/layout-engine-config.ts';
export type {
  NativeControlMetrics,
  NativeControlOptions,
  NativeControlOverrides,
  NativeControlProfile,
} from './api/native-control-profile.ts';
export type { PointerAssertionOptions } from './api/pointer-assertions.ts';
export {
  expectBlockedBy,
  expectReceivesPointer,
  guardedClick,
} from './api/pointer-assertions.ts';
export type {
  TextMeasureInput,
  TextMeasureResult,
  TextMeasurer,
} from './api/text-measurer.ts';
export {
  createDefaultTextMeasurer,
  createDeterministicTextMeasurer,
} from './api/text-measurer.ts';
export type {
  UnsupportedCssContext,
  UnsupportedCssDecision,
  UnsupportedCssPolicy,
  UnsupportedCssReason,
  UnsupportedCssSource,
} from './api/unsupported-css-policy.ts';
export type {
  UnsupportedCssReporter,
  UnsupportedCssSummary,
  UnsupportedCssSummaryEntry,
} from './api/unsupported-css-reporter.ts';
export { createUnsupportedCssReporter } from './api/unsupported-css-reporter.ts';
