import type { DocumentLike } from '../browser-dom/document-like.ts';
import type { NormalizedLayoutEngineConfig } from '../layout-engine-config.ts';
import { DocumentAttachment } from './document-attachment.ts';

export function attachToDocument(
  document: DocumentLike,
  config: NormalizedLayoutEngineConfig,
): DocumentAttachment {
  return new DocumentAttachment({
    document: document as Document,
    viewport: config.viewport,
    unsupportedCss: config.unsupportedCss,
    textMeasurer: config.textMeasurer,
    stylesheets: config.stylesheets,
    userAgentStyles: config.userAgentStyles,
    nativeControlMetrics: config.nativeControlMetrics,
  });
}
