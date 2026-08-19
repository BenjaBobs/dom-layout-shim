import { createDocumentFontTextMeasurer } from '../css-parity-implementation/layout/font-text-measurer.ts';
import { loadTaffyBackend } from '../css-parity-implementation/layout/taffy-layout-source.ts';
import { attachToDocument } from './attachment/attach-to-document.ts';
import type { WindowLike } from './browser-dom/window-like.ts';
import {
  type LayoutEngineConfig,
  normalizeConfig,
  type Viewport,
} from './layout-engine-config.ts';
import { createDefaultTextMeasurer } from './text-measurer.ts';

export type AttachLayoutEngineOptions = LayoutEngineConfig & {
  window: WindowLike;
};

export type LayoutEngineAttachment = {
  setViewport(viewport: Viewport): void;
};

export async function attachLayoutEngine(
  options: AttachLayoutEngineOptions,
): Promise<LayoutEngineAttachment> {
  const { window, ...config } = options;
  const textMeasurer =
    config.textMeasurer ??
    (await createDocumentFontTextMeasurer(
      window.document as Document,
      config.stylesheets ?? [],
      createDefaultTextMeasurer(),
    ));
  const normalizedConfig = normalizeConfig({ ...config, textMeasurer });

  await loadTaffyBackend();

  const attachment = attachToDocument(window.document, normalizedConfig);
  return {
    setViewport(viewport) {
      attachment.setViewport(viewport);
    },
  };
}
