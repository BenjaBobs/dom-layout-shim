import type { Box } from '../box.ts';
import type { DocumentAttachment } from './document-attachment.ts';

export type IntersectionObservation = {
  lastThresholdIndex?: number;
  lastIsIntersecting?: boolean;
};

export type LayoutIntersectionObserver = IntersectionObserver & {
  readonly callback: IntersectionObserverCallback;
  readonly observations: Map<Element, IntersectionObservation>;
  readonly queuedEntries: IntersectionObserverEntry[];
  readonly marginValues: readonly MarginValue[];
};

type MarginValue = { value: number; unit: 'px' | '%' };

export function createIntersectionObserverConstructor(
  attachment: DocumentAttachment,
): typeof IntersectionObserver {
  return class LayoutBackedIntersectionObserver
    implements IntersectionObserver
  {
    readonly callback: IntersectionObserverCallback;
    readonly observations = new Map<Element, IntersectionObservation>();
    readonly queuedEntries: IntersectionObserverEntry[] = [];
    readonly root: Element | Document | null;
    readonly rootMargin: string;
    readonly scrollMargin: string;
    readonly thresholds: readonly number[];
    readonly marginValues: readonly MarginValue[];

    constructor(
      callback: IntersectionObserverCallback,
      options: IntersectionObserverInit = {},
    ) {
      if (typeof callback !== 'function') {
        throw new TypeError('IntersectionObserver callback must be a function');
      }
      this.callback = callback;
      this.root = normalizeRoot(options.root, attachment.document);
      this.marginValues = parseRootMargin(options.rootMargin ?? '0px');
      this.rootMargin = this.marginValues
        .map(value => `${value.value}${value.unit}`)
        .join(' ');
      this.scrollMargin = parseRootMargin(options.scrollMargin ?? '0px')
        .map(value => `${value.value}${value.unit}`)
        .join(' ');
      // The DOM surface exposes the newer scrollMargin member, but the layout
      // engine does not yet expand each nested scroll container. Keeping the
      // normalized value here makes that known gap explicit and avoids relying
      // on happy-dom's inert observer implementation.
      this.thresholds = normalizeThresholds(options.threshold);
      attachment.addIntersectionObserver(this);
    }

    disconnect(): void {
      this.observations.clear();
      this.queuedEntries.length = 0;
      attachment.intersectionObservationsChanged();
    }

    observe(target: Element): void {
      attachment.assertObservationTarget(target, 'IntersectionObserver');
      if (!this.observations.has(target)) {
        this.observations.set(target, {});
        attachment.intersectionObservationsChanged();
      }
    }

    takeRecords(): IntersectionObserverEntry[] {
      return this.queuedEntries.splice(0);
    }

    unobserve(target: Element): void {
      attachment.assertObservationTarget(target, 'IntersectionObserver');
      this.observations.delete(target);
      attachment.intersectionObservationsChanged();
    }
  } as unknown as typeof IntersectionObserver;
}

export function rootIntersectionBox(
  observer: LayoutIntersectionObserver,
  viewport: Box,
  rootBox: Box | undefined,
): Box | null {
  const base = observer.root ? rootBox : viewport;
  if (!base) return null;
  const [top, right, bottom, left] = observer.marginValues;
  const topValue = marginPixels(top, base.height);
  const rightValue = marginPixels(right, base.width);
  const bottomValue = marginPixels(bottom, base.height);
  const leftValue = marginPixels(left, base.width);
  return {
    x: base.x - leftValue,
    y: base.y - topValue,
    width: Math.max(0, base.width + leftValue + rightValue),
    height: Math.max(0, base.height + topValue + bottomValue),
  };
}

export function intersectBoxes(left: Box, right: Box): Box {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const farX = Math.min(left.x + left.width, right.x + right.width);
  const farY = Math.min(left.y + left.height, right.y + right.height);
  return {
    x,
    y,
    width: Math.max(0, farX - x),
    height: Math.max(0, farY - y),
  };
}

export function thresholdIndex(
  thresholds: readonly number[],
  ratio: number,
): number {
  let index = 0;
  while (index < thresholds.length && thresholds[index] <= ratio) index += 1;
  return index;
}

function normalizeRoot(
  root: Element | Document | null | undefined,
  document: Document,
): Element | Document | null {
  if (root == null) return null;
  if (root === document) return root;
  const view = document.defaultView;
  if (
    !view ||
    !(root instanceof view.Element) ||
    root.ownerDocument !== document
  ) {
    throw new TypeError(
      'IntersectionObserver root must belong to the attached document',
    );
  }
  return root;
}

function normalizeThresholds(
  input: number | number[] | undefined,
): readonly number[] {
  const values =
    input === undefined ? [0] : Array.isArray(input) ? input : [input];
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(
        'IntersectionObserver threshold must be between 0 and 1',
      );
    }
  }
  return [...new Set(values)].sort((left, right) => left - right);
}

function parseRootMargin(input: string): readonly MarginValue[] {
  const parts = String(input).trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 4) {
    throw new SyntaxError(
      'IntersectionObserver rootMargin must have 1 to 4 components',
    );
  }
  const parsed = parts.map(part => {
    const match = /^(-?(?:\d+|\d*\.\d+))(px|%)$/.exec(part);
    if (!match) {
      throw new SyntaxError(
        'IntersectionObserver rootMargin supports px and % lengths',
      );
    }
    return { value: Number(match[1]), unit: match[2] as 'px' | '%' };
  });
  const [top, right = top, bottom = top, left = right] =
    parsed.length === 2
      ? [parsed[0], parsed[1], parsed[0], parsed[1]]
      : parsed.length === 3
        ? [parsed[0], parsed[1], parsed[2], parsed[1]]
        : [parsed[0], parsed[1], parsed[2], parsed[3]];
  return [top, right, bottom, left];
}

function marginPixels(value: MarginValue, percentageBasis: number): number {
  return value.unit === '%'
    ? (value.value / 100) * percentageBasis
    : value.value;
}
