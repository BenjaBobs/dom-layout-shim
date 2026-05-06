import { attachToDocument } from '../attachment/attach-to-document.ts'
import type { DocumentAttachment } from '../attachment/document-attachment.ts'
import type { DocumentLike } from '../browser-dom/document-like.ts'
import { normalizeConfig, type LayoutEngineConfig, type NormalizedLayoutEngineConfig } from './layout-engine-config.ts'

export class LayoutEngine {
  private readonly config: NormalizedLayoutEngineConfig
  private initialized = false
  private readonly attachments = new WeakMap<DocumentLike, DocumentAttachment>()

  constructor(config: LayoutEngineConfig = {}) {
    this.config = normalizeConfig(config)
  }

  async initialize(): Promise<void> {
    this.initialized = true
  }

  attachTo(document: DocumentLike): DocumentAttachment {
    if (!this.initialized) {
      throw new Error('Layout engine must be initialized before attachTo(document)')
    }

    const existingAttachment = this.attachments.get(document)

    if (existingAttachment) {
      return existingAttachment
    }

    const attachment = attachToDocument(document, this.config)
    this.attachments.set(document, attachment)
    return attachment
  }
}
