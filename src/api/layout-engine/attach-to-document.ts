import type { DocumentLike } from '../browser-dom/document-like.ts';
import type { NormalizedLayoutEngineConfig } from '../layout-engine-config.ts';
import { DocumentLayoutEngine } from './document-layout-engine.ts';

export function attachToDocument(
  document: DocumentLike,
  config: NormalizedLayoutEngineConfig,
): DocumentLayoutEngine {
  return new DocumentLayoutEngine({
    document: document as Document,
    viewport: config.viewport,
    unsupportedCss: config.unsupportedCss,
    textMeasurer: config.textMeasurer,
    stylesheets: config.stylesheets,
    userAgentStyles: config.userAgentStyles,
    nativeControlMetrics: config.nativeControlMetrics,
    observerDelivery: config.observers.delivery,
  });
}
