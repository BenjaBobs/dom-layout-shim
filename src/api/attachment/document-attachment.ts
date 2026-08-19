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
import { computeTaffyDocumentLayout } from '../../css-parity-implementation/layout/taffy-layout-source.ts';
import { zeroBox } from '../box.ts';
import type {
  UserAgentStyleOptions,
  Viewport,
} from '../layout-engine-config.ts';
import type { NativeControlMetrics } from '../native-control-profile.ts';
import type { TextMeasurer } from '../text-measurer.ts';
import type { UnsupportedCssPolicy } from '../unsupported-css-policy.ts';
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
  private mutationObserver: MutationObserver | undefined;

  constructor(options: DocumentAttachmentOptions) {
    this.document = options.document;
    this.viewport = options.viewport;
    this.unsupportedCss = options.unsupportedCss;
    this.textMeasurer = options.textMeasurer;
    this.stylesheets = options.stylesheets;
    this.userAgentStyles = options.userAgentStyles;
    this.nativeControlMetrics = options.nativeControlMetrics;
    patchDomApis(this);
    this.mutationObserver = observeMutations(this.document, () => {
      this.dirty = true;
    });
  }

  detach(): void {
    if (this.detached) {
      return;
    }

    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    unpatchDomApis(this);
    this.detached = true;
  }

  markDirty(): void {
    this.assertAttached();
    this.dirty = true;
  }

  setViewport(viewport: Viewport): void {
    this.assertAttached();
    this.viewport = { ...viewport };
    this.dirty = true;
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

    this.snapshot = computeTaffyDocumentLayout(
      this.document,
      this.viewport,
      scroll,
      this.unsupportedCss,
      this.textMeasurer,
      this.stylesheets,
      this.userAgentStyles,
      this.nativeControlMetrics,
    );
    this.snapshotScroll = scroll;
    this.snapshotActiveElement = this.document.activeElement;
    this.snapshotHoveredElements = matchingElements(this.document, ':hover');
    this.stylesheetFingerprint = documentStylesheetFingerprint(this.document);
    this.dirty = false;
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
