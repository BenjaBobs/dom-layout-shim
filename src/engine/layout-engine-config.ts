import type { UnsupportedCssPolicy } from '../css/unsupported-css-policy'
import { createDefaultTextMeasurer, type TextMeasurer } from '../text/text-measurer'

export type Viewport = {
  width: number
  height: number
}

export type LayoutEngineConfig = {
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
