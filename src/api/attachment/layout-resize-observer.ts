import type { Box } from '../box.ts';
import type { DocumentAttachment } from './document-attachment.ts';

export type ResizeObservation = {
  box: ResizeObserverBoxOptions;
  lastSize?: ResizeObserverSize;
};

export type LayoutResizeObserver = ResizeObserver & {
  readonly callback: ResizeObserverCallback;
  readonly observations: Map<Element, ResizeObservation>;
};

export function createResizeObserverConstructor(
  attachment: DocumentAttachment,
): typeof ResizeObserver {
  return class LayoutBackedResizeObserver implements ResizeObserver {
    readonly callback: ResizeObserverCallback;
    readonly observations = new Map<Element, ResizeObservation>();

    constructor(callback: ResizeObserverCallback) {
      if (typeof callback !== 'function') {
        throw new TypeError('ResizeObserver callback must be a function');
      }
      this.callback = callback;
      attachment.addResizeObserver(this);
    }

    disconnect(): void {
      this.observations.clear();
      attachment.resizeObservationsChanged();
    }

    observe(target: Element, options: ResizeObserverOptions = {}): void {
      attachment.assertObservationTarget(target, 'ResizeObserver');
      const box = options.box ?? 'content-box';
      this.observations.set(target, { box });
      attachment.resizeObservationsChanged();
    }

    unobserve(target: Element): void {
      attachment.assertObservationTarget(target, 'ResizeObserver');
      this.observations.delete(target);
      attachment.resizeObservationsChanged();
    }
  } as unknown as typeof ResizeObserver;
}

export function observedSize(
  box: ResizeObserverBoxOptions,
  content: Box,
  border: Box,
  devicePixelRatio: number,
): ResizeObserverSize {
  const source = box === 'border-box' ? border : content;
  const scale = box === 'device-pixel-content-box' ? devicePixelRatio : 1;
  if (box === 'device-pixel-content-box') {
    return {
      inlineSize: Math.round(source.width * scale),
      blockSize: Math.round(source.height * scale),
    };
  }
  return {
    inlineSize: Math.round(source.width * scale * 1e6) / 1e6,
    blockSize: Math.round(source.height * scale * 1e6) / 1e6,
  };
}

export function sameResizeSize(
  left: ResizeObserverSize | undefined,
  right: ResizeObserverSize,
): boolean {
  return Boolean(
    left &&
      left.inlineSize === right.inlineSize &&
      left.blockSize === right.blockSize,
  );
}
