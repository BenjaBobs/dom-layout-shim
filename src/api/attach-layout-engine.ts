import { createDocumentFontTextMeasurer } from '../css-parity-implementation/layout/font-text-measurer.ts';
import { loadTaffyBackend } from '../css-parity-implementation/layout/taffy-layout-source.ts';
import { attachToDocument } from './attachment/attach-to-document.ts';
import { isDocumentAttached } from './attachment/patch-dom-apis.ts';
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
  /** Restore DOM APIs and release this attachment. Safe to call repeatedly. */
  detach(): void;
  setViewport(viewport: Viewport): void;
  /** Recomputes dirty layout and synchronously settles layout-backed observers. */
  flushLayout(): void;
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
    detach() {
      attachment.detach();
    },
    flushLayout() {
      attachment.flushLayout();
    },
    setViewport(viewport) {
      attachment.setViewport(viewport);
    },
  };
}

/** Whether this window currently has an active layout engine attachment. */
export function isLayoutEngineAttached(window: WindowLike): boolean {
  return isDocumentAttached(window.document as Document);
}
