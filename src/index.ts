export { attachLayoutEngine } from './engine/attach-layout-engine.ts'
export type { AttachLayoutEngineOptions } from './engine/attach-layout-engine.ts'
export type { LayoutEngineConfig, Viewport } from './engine/layout-engine-config.ts'
export { debugLayout } from './attachment/patch-dom-apis.ts'
export type { UnsupportedCssContext, UnsupportedCssDecision, UnsupportedCssPolicy } from './css/unsupported-css-policy.ts'
export { cssSupportInventory, getInventoriedCssProperties, getInventoriedHtmlElements } from './css/css-support-inventory.ts'
export type {
  CssSupportEffect,
  CssSupportEntry,
  CssSupportOwnerArea,
  CssSupportNote,
  CssSupportNoteKind,
  CssSupportParityStatus,
  CssSupportStatus,
} from './css/css-support-inventory.ts'
export type { Box } from './geometry/box.ts'
export type { HitBox } from './hit-testing/hit-box.ts'
export {
  createDefaultTextMeasurer,
  createDeterministicTextMeasurer,
  createPretextTextMeasurer,
} from './text/text-measurer.ts'
export type { TextMeasureInput, TextMeasureResult, TextMeasurer } from './text/text-measurer.ts'
