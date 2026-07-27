import type { UnsupportedCssPolicy } from './unsupported-css-policy.ts'
import { createDefaultTextMeasurer, type TextMeasurer } from './text-measurer.ts'

export type Viewport = {
  width: number
  height: number
}

export type LayoutEngineConfig = {
  /**
   * @deprecated Taffy is the only active backend. This option is accepted as a
   * compatibility no-op for callers that previously opted into Taffy.
   */
  layoutBackend?: 'taffy'
  viewport?: Viewport
  unsupportedCss?: UnsupportedCssPolicy
  textMeasurer?: TextMeasurer
  stylesheets?: readonly string[]
}

export type NormalizedLayoutEngineConfig = {
  viewport: Viewport
  unsupportedCss: UnsupportedCssPolicy
  textMeasurer: TextMeasurer
  stylesheets: readonly string[]
}

export function normalizeConfig(config: LayoutEngineConfig = {}): NormalizedLayoutEngineConfig {
  return {
    viewport: config.viewport ?? { width: 1280, height: 720 },
    unsupportedCss: config.unsupportedCss ?? { default: 'throw' },
    textMeasurer: config.textMeasurer ?? createDefaultTextMeasurer(),
    stylesheets: config.stylesheets ?? [],
  }
}
