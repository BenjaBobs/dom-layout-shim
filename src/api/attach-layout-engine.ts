import type { WindowLike } from './browser-dom/window-like.ts'
import { attachToDocument } from './attachment/attach-to-document.ts'
import { loadTaffyBackend } from '../css-parity-implementation/layout/taffy-layout-source.ts'
import { normalizeConfig, type LayoutEngineConfig, type Viewport } from './layout-engine-config.ts'

export type AttachLayoutEngineOptions = LayoutEngineConfig & {
  window: WindowLike
}

export type LayoutEngineAttachment = {
  setViewport(viewport: Viewport): void
}

export async function attachLayoutEngine(options: AttachLayoutEngineOptions): Promise<LayoutEngineAttachment> {
  const { window, ...config } = options
  const normalizedConfig = normalizeConfig(config)

  await loadTaffyBackend()

  const attachment = attachToDocument(window.document, normalizedConfig)
  return {
    setViewport(viewport) {
      attachment.setViewport(viewport)
    },
  }
}
