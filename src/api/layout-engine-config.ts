import type { UnsupportedCssPolicy } from './unsupported-css-policy.ts'
import { createDefaultTextMeasurer, type TextMeasurer } from './text-measurer.ts'
import {
  getNativeControlMetrics,
  type NativeControlMetrics,
  type NativeControlOptions,
} from './native-control-profile.ts'

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
  nativeControls?: NativeControlOptions
}

export type NormalizedLayoutEngineConfig = {
  viewport: Viewport
  unsupportedCss: UnsupportedCssPolicy
  textMeasurer: TextMeasurer
  stylesheets: readonly string[]
  nativeControlMetrics: NativeControlMetrics
}

export function normalizeConfig(config: LayoutEngineConfig = {}): NormalizedLayoutEngineConfig {
  const nativeControlProfile = config.nativeControls?.profile ?? 'portable'

  return {
    viewport: config.viewport ?? { width: 1280, height: 720 },
    unsupportedCss: { default: 'warn', ...config.unsupportedCss },
    textMeasurer: config.textMeasurer ?? createDefaultTextMeasurer(),
    stylesheets: config.stylesheets ?? [],
    nativeControlMetrics: getNativeControlMetrics(nativeControlProfile, config.nativeControls?.overrides),
  }
}
