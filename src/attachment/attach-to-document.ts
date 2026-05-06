import type { NormalizedLayoutEngineConfig } from '../engine/layout-engine-config'
import type { DocumentLike } from '../browser-dom/document-like'
import { DocumentAttachment } from './document-attachment'

export function attachToDocument(document: DocumentLike, config: NormalizedLayoutEngineConfig): DocumentAttachment {
  return new DocumentAttachment({
    document: document as Document,
    viewport: config.viewport,
    unsupportedCss: config.unsupportedCss,
    textMeasurer: config.textMeasurer,
    stylesheets: config.stylesheets,
  })
}
