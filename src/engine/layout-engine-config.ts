import type { UnsupportedCssPolicy } from '../css/unsupported-css-policy.ts'
import { createDefaultTextMeasurer, type TextMeasurer } from '../text/text-measurer.ts'

export type Viewport = {
  width: number
  height: number
}

export type LayoutEngineConfig = {
  layoutBackend?: 'legacy' | 'taffy'
  viewport?: Viewport
  unsupportedCss?: UnsupportedCssPolicy
  textMeasurer?: TextMeasurer
  stylesheets?: readonly string[]
}

export type NormalizedLayoutEngineConfig = {
  layoutBackend: 'legacy' | 'taffy'
  viewport: Viewport
  unsupportedCss: UnsupportedCssPolicy
  textMeasurer: TextMeasurer
  stylesheets: readonly string[]
}

export function normalizeConfig(config: LayoutEngineConfig = {}): NormalizedLayoutEngineConfig {
  return {
    layoutBackend: config.layoutBackend ?? 'legacy',
    viewport: config.viewport ?? { width: 1280, height: 720 },
    unsupportedCss: config.unsupportedCss ?? { default: 'throw' },
    textMeasurer: config.textMeasurer ?? createDefaultTextMeasurer(),
    stylesheets: config.stylesheets ?? [],
  }
}
