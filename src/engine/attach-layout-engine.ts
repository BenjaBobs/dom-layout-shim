import type { WindowLike } from '../browser-dom/window-like.ts'
import { attachToDocument } from '../attachment/attach-to-document.ts'
import { loadTaffyBackend } from '../layout/taffy-layout-source.ts'
import { normalizeConfig, type LayoutEngineConfig } from './layout-engine-config.ts'

export type AttachLayoutEngineOptions = LayoutEngineConfig & {
  window: WindowLike
}

export async function attachLayoutEngine(options: AttachLayoutEngineOptions): Promise<void> {
  const { window, ...config } = options
  const normalizedConfig = normalizeConfig(config)

  await loadTaffyBackend()

  attachToDocument(window.document, normalizedConfig)
}
