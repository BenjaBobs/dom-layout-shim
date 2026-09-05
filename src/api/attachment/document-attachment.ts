import { documentStylesheetFingerprint } from '../../css-parity-implementation/css/stylesheet-source.ts';
import { createDomRect } from '../../css-parity-implementation/geometry/dom-rect.ts';
import {
  elementFromPointInBoxes,
  elementsFromPointInBoxes,
} from '../../css-parity-implementation/hit-testing/point-query.ts';
import type {
  LayoutSnapshot,
  ScrollOffset,
} from '../../css-parity-implementation/layout/layout-source.ts';
import {
  computeTaffyDocumentLayout,
  type LayoutStylesheetCache,
} from '../../css-parity-implementation/layout/taffy-layout-source.ts';
import { type Box, zeroBox } from '../box.ts';
import type {
  ObserverDelivery,
  UserAgentStyleOptions,
  Viewport,
} from '../layout-engine-config.ts';
import type { NativeControlMetrics } from '../native-control-profile.ts';
import type { TextMeasurer } from '../text-measurer.ts';
import type { UnsupportedCssPolicy } from '../unsupported-css-policy.ts';
import {
  intersectBoxes,
  type LayoutIntersectionObserver,
  rootIntersectionBox,
  thresholdIndex,
} from './layout-intersection-observer.ts';
import {
  type LayoutResizeObserver,
  observedSize,
  sameResizeSize,
} from './layout-resize-observer.ts';
import { patchDomApis, unpatchDomApis } from './patch-dom-apis.ts';
import { matchesViewportMediaQuery } from './viewport-media-query.ts';

export type DocumentAttachmentOptions = {
  document: Document;
  viewport: Viewport;
  unsupportedCss?: UnsupportedCssPolicy;
  textMeasurer: TextMeasurer;
  stylesheets: readonly string[];
  userAgentStyles: Required<UserAgentStyleOptions>;
  nativeControlMetrics: NativeControlMetrics;
  observerDelivery: ObserverDelivery;
};

export class DocumentAttachment {
  readonly document: Document;

  private viewport: Viewport;
  private readonly unsupportedCss: UnsupportedCssPolicy | undefined;
  private readonly textMeasurer: TextMeasurer;
  private readonly stylesheets: readonly string[];
  private readonly userAgentStyles: Required<UserAgentStyleOptions>;
  private readonly nativeControlMetrics: NativeControlMetrics;
  private dirty = true;
  private detached = false;
  private snapshot: LayoutSnapshot | undefined;
  private snapshotScroll: ScrollOffset | undefined;
  private snapshotActiveElement: Element | null | undefined;
  private snapshotHoveredElements: Element[] = [];
  private stylesheetFingerprint: string | undefined;
  private readonly stylesheetCache: LayoutStylesheetCache = {};
  private mutationObserver: MutationObserver | undefined;
  private readonly observerDelivery: ObserverDelivery;
  private readonly resizeObservers = new Set<LayoutResizeObserver>();
  private readonly intersectionObservers =
    new Set<LayoutIntersectionObserver>();
  private observerDeliveryScheduled = false;
  private observerDeliveryFrame: number | undefined;
  private flushingObservers = false;
  private readonly handleScroll = (): void => {
    this.scheduleObserverDelivery();
  };

  private readonly handleImageResource = (event: Event): void => {
    const target = event.target as Element | null;
    if (target?.tagName?.toLowerCase() === 'img') this.markDirty();
  };

  constructor(options: DocumentAttachmentOptions) {
    this.document = options.document;
    this.viewport = options.viewport;
    this.unsupportedCss = options.unsupportedCss;
    this.textMeasurer = options.textMeasurer;
    this.stylesheets = options.stylesheets;
    this.userAgentStyles = options.userAgentStyles;
    this.nativeControlMetrics = options.nativeControlMetrics;
    this.observerDelivery = options.observerDelivery;
    patchDomApis(this);
    this.mutationObserver = observeMutations(this.document, () => {
      this.dirty = true;
      this.scheduleObserverDelivery();
    });
    this.document.addEventListener('scroll', this.handleScroll, true);
    // Image decoding changes natural dimensions without a DOM mutation.
    this.document.addEventListener('load', this.handleImageResource, true);
    this.document.addEventListener('error', this.handleImageResource, true);
    this.document.defaultView?.addEventListener('scroll', this.handleScroll);
  }

  detach(): void {
    if (this.detached) {
      return;
    }

    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    this.document.removeEventListener('scroll', this.handleScroll, true);
    this.document.removeEventListener('load', this.handleImageResource, true);
    this.document.removeEventListener('error', this.handleImageResource, true);
    this.document.defaultView?.removeEventListener('scroll', this.handleScroll);
    this.cancelScheduledObserverDelivery();
    unpatchDomApis(this);
    this.detached = true;
  }

  markDirty(): void {
    this.assertAttached();
    this.dirty = true;
    this.scheduleObserverDelivery();
  }

  setViewport(viewport: Viewport): void {
    this.assertAttached();
    this.viewport = { ...viewport };
    this.dirty = true;
    this.scheduleObserverDelivery();
    this.document.defaultView?.dispatchEvent(
      new this.document.defaultView.Event('resize'),
    );
  }

  getViewport(): Viewport {
    this.assertAttached();
    return { ...this.viewport };
  }

  recompute(): void {
    this.assertAttached();
    const scroll = readScrollOffset(this.document);
    const stylesheetFingerprint = documentStylesheetFingerprint(this.document);

    this.snapshot = computeTaffyDocumentLayout(
      this.document,
      this.viewport,
      scroll,
      this.unsupportedCss,
      this.textMeasurer,
      this.stylesheets,
      this.userAgentStyles,
      this.nativeControlMetrics,
      this.stylesheetCache,
      stylesheetFingerprint,
    );
    this.snapshotScroll = scroll;
    this.snapshotActiveElement = this.document.activeElement;
    this.snapshotHoveredElements = matchingElements(this.document, ':hover');
    this.stylesheetFingerprint = stylesheetFingerprint;
    this.dirty = false;
  }

  flushLayout(): void {
    this.assertAttached();
    if (this.flushingObservers) {
      return;
    }

    if (this.mutationObserver?.takeRecords().length) {
      this.dirty = true;
    }

    this.cancelScheduledObserverDelivery();
    this.flushingObservers = true;
    try {
      let resizeLoopSettled = false;
      for (let iteration = 0; iteration < 10; iteration += 1) {
        const delivered = this.deliverResizeObservers();
        if (this.mutationObserver?.takeRecords().length) {
          this.dirty = true;
        }
        if (!delivered || !this.dirty) {
          resizeLoopSettled = true;
          break;
        }
      }

      if (!resizeLoopSettled) {
        const view = this.document.defaultView;
        view?.dispatchEvent(
          new view.ErrorEvent('error', {
            message:
              'ResizeObserver loop completed with undelivered notifications.',
          }),
        );
      }
      this.deliverIntersectionObservers();
    } finally {
      this.flushingObservers = false;
    }
  }

  addResizeObserver(observer: LayoutResizeObserver): void {
    this.assertAttached();
    this.resizeObservers.add(observer);
  }

  addIntersectionObserver(observer: LayoutIntersectionObserver): void {
    this.assertAttached();
    this.intersectionObservers.add(observer);
  }

  intersectionObservationsChanged(): void {
    this.assertAttached();
    this.scheduleObserverDelivery();
  }

  resizeObservationsChanged(): void {
    this.assertAttached();
    this.scheduleObserverDelivery();
  }

  assertObservationTarget(target: Element, api: string): void {
    this.assertAttached();
    const view = this.document.defaultView;
    if (!view || !(target instanceof view.Element)) {
      throw new TypeError(`${api} target must be an Element`);
    }
    if (target.ownerDocument !== this.document) {
      throw new TypeError(`${api} target belongs to a different document`);
    }
  }

  getBoundingClientRect(element: Element): DOMRect {
    const snapshot = this.getSnapshot();
    return createDomRect(
      this.document,
      snapshot.rects.get(element) ?? zeroBox(),
    );
  }

  getClientRects(element: Element): DOMRectList {
    const snapshot = this.getSnapshot();
    const rects = (snapshot.fragmentRects.get(element) ?? []).map(box =>
      createDomRect(this.document, box),
    );
    Object.defineProperty(rects, 'item', {
      value(index: number) {
        return rects[index] ?? null;
      },
    });
    return rects as unknown as DOMRectList;
  }

  offsetWidth(element: Element): number {
    return roundCssPixel(
      this.getSnapshot().layoutRects.get(element)?.width ?? 0,
    );
  }

  offsetHeight(element: Element): number {
    return roundCssPixel(
      this.getSnapshot().layoutRects.get(element)?.height ?? 0,
    );
  }

  offsetTop(element: Element): number {
    return this.offsetPosition(element, 'y');
  }

  offsetLeft(element: Element): number {
    return this.offsetPosition(element, 'x');
  }

  offsetParent(element: Element): Element | null {
    return this.getSnapshot().offsetParents.get(element) ?? null;
  }

  clientWidth(element: Element): number {
    return roundCssPixel(
      this.getSnapshot().clientRects.get(element)?.width ?? 0,
    );
  }

  clientHeight(element: Element): number {
    return roundCssPixel(
      this.getSnapshot().clientRects.get(element)?.height ?? 0,
    );
  }

  scrollIntoView(
    element: Element,
    arg?: boolean | ScrollIntoViewOptions,
  ): void {
    const alignment = normalizeScrollIntoViewOptions(arg);
    let snapshot = this.getSnapshot();

    if (snapshot.fixedElements.has(element)) {
      return;
    }

    for (
      let ancestor = element.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (
        ancestor === this.document.body ||
        ancestor === this.document.documentElement
      ) {
        continue;
      }

      const axes = snapshot.scrollContainers.get(ancestor);

      if (!axes?.x && !axes?.y) {
        continue;
      }

      const target = snapshot.rects.get(element);
      const container = snapshot.clientRects.get(ancestor);

      if (!target || !container) {
        continue;
      }

      if (axes.x) {
        ancestor.scrollLeft = clampScroll(
          ancestor.scrollLeft +
            alignmentDelta(
              target.x,
              target.x + target.width,
              container.x,
              container.x + container.width,
              alignment.inline,
            ),
          maximumElementScroll(ancestor, 'x', snapshot),
        );
      }

      if (axes.y) {
        ancestor.scrollTop = clampScroll(
          ancestor.scrollTop +
            alignmentDelta(
              target.y,
              target.y + target.height,
              container.y,
              container.y + container.height,
              alignment.block,
            ),
          maximumElementScroll(ancestor, 'y', snapshot),
        );
      }

      snapshot = this.getSnapshot();
    }

    const target = snapshot.rects.get(element);
    const view = this.document.defaultView;

    if (!target || !view) {
      return;
    }

    view.scrollTo(
      clampScroll(
        view.scrollX +
          alignmentDelta(
            target.x,
            target.x + target.width,
            0,
            this.viewport.width,
            alignment.inline,
          ),
        maximumViewportScroll('x', snapshot, this.viewport, view.scrollX),
      ),
      clampScroll(
        view.scrollY +
          alignmentDelta(
            target.y,
            target.y + target.height,
            0,
            this.viewport.height,
            alignment.block,
          ),
        maximumViewportScroll('y', snapshot, this.viewport, view.scrollY),
      ),
    );
  }

  matchesMediaQuery(query: string): boolean {
    this.assertAttached();
    return matchesViewportMediaQuery(query, this.viewport);
  }

  elementFromPoint(x: number, y: number): Element | null {
    return elementFromPointInBoxes(this.getSnapshot().boxes, x, y);
  }

  elementsFromPoint(x: number, y: number): Element[] {
    return elementsFromPointInBoxes(this.getSnapshot().boxes, x, y);
  }

  receivesPointerAtCenter(element: Element): boolean {
    const rect = this.getBoundingClientRect(element);
    const top = this.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return top === element || Boolean(top && element.contains(top));
  }

  debug(): string {
    const snapshot = this.getSnapshot();

    return snapshot.boxes
      .map(box => {
        const label = describeElement(box.element);
        const blocker = findCenterBlocker(box.element, box, snapshot.boxes);
        const blockedBy = blocker
          ? ` BLOCKED_BY=${describeElement(blocker)}`
          : '';
        return `${label} x=${formatNumber(box.x)} y=${formatNumber(box.y)} w=${formatNumber(box.width)} h=${formatNumber(box.height)} z=${box.zIndex} pe=${box.pointerEvents} visibility=${box.visibility}${blockedBy}`;
      })
      .join('\n');
  }

  private getSnapshot(): LayoutSnapshot {
    this.assertAttached();

    if (
      this.dirty ||
      !this.snapshot ||
      this.stylesheetFingerprint !==
        documentStylesheetFingerprint(this.document) ||
      !sameScrollOffset(this.snapshotScroll, readScrollOffset(this.document)) ||
      this.snapshotActiveElement !== this.document.activeElement ||
      !sameElements(
        this.snapshotHoveredElements,
        matchingElements(this.document, ':hover'),
      ) ||
      hasElementScrollChanged(this.snapshot.elementScrolls)
    ) {
      this.recompute();
    }

    const snapshot = this.snapshot;

    if (!snapshot) {
      throw new Error('Layout snapshot was not computed');
    }

    return snapshot;
  }

  private hasResizeObservations(): boolean {
    for (const observer of this.resizeObservers) {
      if (observer.observations.size > 0) return true;
    }
    return false;
  }

  private hasIntersectionObservations(): boolean {
    for (const observer of this.intersectionObservers) {
      if (observer.observations.size > 0) return true;
    }
    return false;
  }

  private scheduleObserverDelivery(): void {
    if (
      this.observerDelivery !== 'auto' ||
      this.observerDeliveryScheduled ||
      (!this.hasResizeObservations() && !this.hasIntersectionObservations())
    ) {
      return;
    }

    this.observerDeliveryScheduled = true;
    const view = this.document.defaultView;
    if (!view) return;
    // Native layout observers are delivered during the rendering update. A
    // frame callback is the closest scheduling boundary exposed by DOM-like
    // test environments, and coalesces framework work across task phases.
    this.observerDeliveryFrame = view.requestAnimationFrame(() => {
      this.observerDeliveryFrame = undefined;
      if (!this.detached && this.observerDeliveryScheduled) {
        this.flushLayout();
      }
    });
  }

  private cancelScheduledObserverDelivery(): void {
    if (this.observerDeliveryFrame !== undefined) {
      this.document.defaultView?.cancelAnimationFrame(
        this.observerDeliveryFrame,
      );
      this.observerDeliveryFrame = undefined;
    }
    this.observerDeliveryScheduled = false;
  }

  private deliverResizeObservers(): boolean {
    if (!this.hasResizeObservations()) return false;
    const snapshot = this.getSnapshot();
    const view = this.document.defaultView;
    const ratio = view?.devicePixelRatio ?? 1;
    let delivered = false;

    for (const observer of this.resizeObservers) {
      const entries: ResizeObserverEntry[] = [];
      for (const [target, observation] of observer.observations) {
        const border = snapshot.layoutRects.get(target) ?? zeroBox();
        const content = snapshot.contentRects.get(target) ?? zeroBox();
        const size = observedSize(observation.box, content, border, ratio);
        if (
          sameResizeSize(observation.lastSize, size) ||
          (!observation.lastSize &&
            size.inlineSize === 0 &&
            size.blockSize === 0)
        ) {
          continue;
        }

        observation.lastSize = size;
        const contentRect = createDomRect(this.document, {
          x: content.x - (snapshot.clientRects.get(target)?.x ?? content.x),
          y: content.y - (snapshot.clientRects.get(target)?.y ?? content.y),
          width: content.width,
          height: content.height,
        });
        entries.push({
          target,
          contentRect,
          borderBoxSize: [observedSize('border-box', content, border, ratio)],
          contentBoxSize: [observedSize('content-box', content, border, ratio)],
          devicePixelContentBoxSize: [
            observedSize('device-pixel-content-box', content, border, ratio),
          ],
        });
      }

      if (entries.length > 0) {
        delivered = true;
        observer.callback(entries, observer);
      }
    }
    return delivered;
  }

  private deliverIntersectionObservers(): void {
    if (!this.hasIntersectionObservations()) return;
    const snapshot = this.getSnapshot();
    const viewport = {
      x: 0,
      y: 0,
      width: this.viewport.width,
      height: this.viewport.height,
    };
    const now = this.document.defaultView?.performance.now() ?? 0;

    for (const observer of this.intersectionObservers) {
      const rootElement =
        observer.root && observer.root !== this.document
          ? (observer.root as Element)
          : undefined;
      const rootBounds = rootIntersectionBox(
        observer,
        viewport,
        rootElement ? snapshot.clientRects.get(rootElement) : undefined,
      );

      for (const [target, observation] of observer.observations) {
        const targetRect = snapshot.rects.get(target) ?? zeroBox();
        const clippedTargetRect =
          observer.root || observer.rootMargin === '0px 0px 0px 0px'
            ? (snapshot.intersectionRects.get(target) ?? zeroBox())
            : targetRect;
        const rendered = (snapshot.fragmentRects.get(target)?.length ?? 0) > 0;
        const targetInRoot =
          !rootElement ||
          (rootElement !== target && rootElement.contains(target));
        const intersectionRect =
          rootBounds && targetInRoot && rendered
            ? intersectBoxes(clippedTargetRect, rootBounds)
            : zeroBox();
        const isIntersecting = Boolean(
          rootBounds &&
            targetInRoot &&
            rendered &&
            boxesTouchOrOverlap(clippedTargetRect, rootBounds),
        );
        const targetArea = targetRect.width * targetRect.height;
        const intersectionArea =
          intersectionRect.width * intersectionRect.height;
        const ratio =
          targetArea === 0
            ? isIntersecting
              ? 1
              : 0
            : intersectionArea / targetArea;
        const nextThresholdIndex = thresholdIndex(observer.thresholds, ratio);
        if (
          observation.lastThresholdIndex === nextThresholdIndex &&
          observation.lastIsIntersecting === isIntersecting
        ) {
          continue;
        }

        observation.lastThresholdIndex = nextThresholdIndex;
        observation.lastIsIntersecting = isIntersecting;
        observer.queuedEntries.push({
          time: now,
          target,
          rootBounds: rootBounds
            ? createDomRect(this.document, rootBounds)
            : null,
          boundingClientRect: createDomRect(this.document, targetRect),
          intersectionRect: createDomRect(this.document, intersectionRect),
          isIntersecting,
          intersectionRatio: ratio,
        });
      }

      const entries = observer.takeRecords();
      if (entries.length > 0) observer.callback(entries, observer);
    }
  }

  private offsetPosition(element: Element, axis: 'x' | 'y'): number {
    const snapshot = this.getSnapshot();
    const box = snapshot.layoutRects.get(element);
    const offsetParent = snapshot.offsetParents.get(element);

    if (!box) {
      return 0;
    }

    const parentOrigin = offsetParent
      ? (snapshot.clientRects.get(offsetParent)?.[axis] ?? 0)
      : 0;
    let scrollOffset = 0;

    for (
      let ancestor = element.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      scrollOffset +=
        axis === 'x'
          ? (snapshot.elementScrolls.get(ancestor)?.x ?? 0)
          : (snapshot.elementScrolls.get(ancestor)?.y ?? 0);

      if (ancestor === offsetParent) {
        break;
      }
    }

    return roundCssPixel(box[axis] - parentOrigin + scrollOffset);
  }

  private assertAttached(): void {
    if (this.detached) {
      throw new Error('Cannot use a detached layout engine attachment');
    }
  }
}

function matchingElements(document: Document, selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function sameElements(
  left: readonly Element[],
  right: readonly Element[],
): boolean {
  return (
    left.length === right.length &&
    left.every((element, index) => element === right[index])
  );
}

type ScrollAlignment = {
  block: ScrollLogicalPosition;
  inline: ScrollLogicalPosition;
};

function normalizeScrollIntoViewOptions(
  arg: boolean | ScrollIntoViewOptions | undefined,
): ScrollAlignment {
  if (typeof arg === 'boolean') {
    return {
      block: arg ? 'start' : 'end',
      inline: 'nearest',
    };
  }

  return {
    block: arg?.block ?? 'start',
    inline: arg?.inline ?? 'nearest',
  };
}

function alignmentDelta(
  targetStart: number,
  targetEnd: number,
  viewportStart: number,
  viewportEnd: number,
  alignment: ScrollLogicalPosition,
): number {
  switch (alignment) {
    case 'start':
      return targetStart - viewportStart;
    case 'center':
      return (targetStart + targetEnd - viewportStart - viewportEnd) / 2;
    case 'end':
      return targetEnd - viewportEnd;
    case 'nearest':
      return nearestAlignmentDelta(
        targetStart,
        targetEnd,
        viewportStart,
        viewportEnd,
      );
  }
}

function nearestAlignmentDelta(
  targetStart: number,
  targetEnd: number,
  viewportStart: number,
  viewportEnd: number,
): number {
  if (
    (targetStart >= viewportStart && targetEnd <= viewportEnd) ||
    (targetStart < viewportStart && targetEnd > viewportEnd)
  ) {
    return 0;
  }

  if (targetStart < viewportStart) {
    return targetStart - viewportStart;
  }

  return targetEnd - viewportEnd;
}

function maximumElementScroll(
  container: Element,
  axis: 'x' | 'y',
  snapshot: LayoutSnapshot,
): number {
  const client = snapshot.clientRects.get(container);

  if (!client) {
    return 0;
  }

  const currentScroll =
    axis === 'x' ? container.scrollLeft : container.scrollTop;
  const clientStart = client[axis];
  const clientSize = axis === 'x' ? client.width : client.height;
  let contentEnd = clientStart + clientSize;

  for (const [element, box] of snapshot.rects) {
    if (element !== container && container.contains(element)) {
      const boxEnd = box[axis] + (axis === 'x' ? box.width : box.height);
      contentEnd = Math.max(contentEnd, boxEnd + currentScroll);
    }
  }

  return Math.max(0, contentEnd - clientStart - clientSize);
}

function maximumViewportScroll(
  axis: 'x' | 'y',
  snapshot: LayoutSnapshot,
  viewport: Viewport,
  currentScroll: number,
): number {
  let contentEnd = axis === 'x' ? viewport.width : viewport.height;

  for (const [element, box] of snapshot.rects) {
    if (!snapshot.fixedElements.has(element)) {
      contentEnd = Math.max(
        contentEnd,
        box[axis] + (axis === 'x' ? box.width : box.height) + currentScroll,
      );
    }
  }

  return Math.max(
    0,
    contentEnd - (axis === 'x' ? viewport.width : viewport.height),
  );
}

function clampScroll(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, value));
}

function readScrollOffset(document: Document): ScrollOffset {
  const view = document.defaultView;

  return {
    x: view?.scrollX ?? document.documentElement?.scrollLeft ?? 0,
    y: view?.scrollY ?? document.documentElement?.scrollTop ?? 0,
  };
}

function sameScrollOffset(
  a: ScrollOffset | undefined,
  b: ScrollOffset,
): boolean {
  return Boolean(a && a.x === b.x && a.y === b.y);
}

function boxesTouchOrOverlap(left: Box, right: Box): boolean {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}

function hasElementScrollChanged(
  scrolls: ReadonlyMap<Element, ScrollOffset>,
): boolean {
  for (const [element, scroll] of scrolls) {
    if (
      !sameScrollOffset(scroll, { x: element.scrollLeft, y: element.scrollTop })
    ) {
      return true;
    }
  }

  return false;
}

function roundCssPixel(value: number): number {
  return Math.round(value);
}

function findCenterBlocker(
  element: Element,
  box: { x: number; y: number; width: number; height: number },
  boxes: LayoutSnapshot['boxes'],
): Element | null {
  const top = elementFromPointInBoxes(
    boxes,
    box.x + box.width / 2,
    box.y + box.height / 2,
  );

  if (!top || top === element || element.contains(top)) {
    return null;
  }

  return top;
}

function describeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const className =
    typeof element.className === 'string' && element.className
      ? `.${element.className.trim().replace(/\s+/g, '.')}`
      : '';

  return `${element.tagName.toLowerCase()}${id}${className}`;
}

function formatNumber(value: number): string {
  return Object.is(value, -0) ? '0' : String(Number(value.toFixed(4)));
}

function observeMutations(
  document: Document,
  markDirty: () => void,
): MutationObserver | undefined {
  const MutationObserver = document.defaultView?.MutationObserver;
  const root = document.documentElement;

  if (!MutationObserver || !root) {
    return undefined;
  }

  const observer = new MutationObserver(markDirty);

  observer.observe(root, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  return observer;
}
