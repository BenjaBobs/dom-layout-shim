import { createDocumentFontTextMeasurer } from '../css-parity-implementation/layout/font-text-measurer.ts';
import { loadTaffyBackend } from '../css-parity-implementation/layout/taffy-layout-source.ts';
import type { WindowLike } from './browser-dom/window-like.ts';
import { attachToDocument } from './layout-engine/attach-to-document.ts';
import { isDocumentAttached } from './layout-engine/patch-dom-apis.ts';
import {
  type LayoutEngineConfig,
  normalizeConfig,
  type Viewport,
} from './layout-engine-config.ts';
import { createDefaultTextMeasurer } from './text-measurer.ts';

export type AttachLayoutEngineOptions = LayoutEngineConfig & {
  window: WindowLike;
};

export type LayoutEngine = {
  /** Restore DOM APIs and release this layout engine. Safe to call repeatedly. */
  detach(): void;
  setViewport(viewport: Viewport): void;
  /** Recomputes dirty layout and synchronously settles layout-backed observers. */
  flushLayout(): void;
};

export async function attachLayoutEngine(
  options: AttachLayoutEngineOptions,
): Promise<LayoutEngine> {
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

  const layoutEngine = attachToDocument(window.document, normalizedConfig);
  return {
    detach() {
      layoutEngine.detach();
    },
    flushLayout() {
      layoutEngine.flushLayout();
    },
    setViewport(viewport) {
      layoutEngine.setViewport(viewport);
    },
  };
}

/** Whether this window currently has an active layout engine. */
export function isLayoutEngineAttached(window: WindowLike): boolean {
  return isDocumentAttached(window.document as Document);
}
