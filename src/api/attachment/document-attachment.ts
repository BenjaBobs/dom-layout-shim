import type { UnsupportedCssPolicy } from '../unsupported-css-policy.ts'
import type { Viewport } from '../layout-engine-config.ts'
import { createDomRect } from '../../css-parity-implementation/geometry/dom-rect.ts'
import { zeroBox } from '../box.ts'
import {
  elementFromPointInBoxes,
  elementsFromPointInBoxes,
} from '../../css-parity-implementation/hit-testing/point-query.ts'
import type {
  LayoutSnapshot,
  ScrollOffset,
} from '../../css-parity-implementation/layout/layout-source.ts'
import { computeTaffyDocumentLayout } from '../../css-parity-implementation/layout/taffy-layout-source.ts'
import { documentStylesheetFingerprint } from '../../css-parity-implementation/css/stylesheet-source.ts'
import type { TextMeasurer } from '../text-measurer.ts'
import { patchDomApis, unpatchDomApis } from './patch-dom-apis.ts'

export type DocumentAttachmentOptions = {
  document: Document
  viewport: Viewport
  unsupportedCss?: UnsupportedCssPolicy
  textMeasurer: TextMeasurer
  stylesheets: readonly string[]
}

export class DocumentAttachment {
  readonly document: Document

  private readonly viewport: Viewport
  private readonly unsupportedCss: UnsupportedCssPolicy | undefined
  private readonly textMeasurer: TextMeasurer
  private readonly stylesheets: readonly string[]
  private dirty = true
  private detached = false
  private snapshot: LayoutSnapshot | undefined
  private snapshotScroll: ScrollOffset | undefined
  private stylesheetFingerprint: string | undefined
  private mutationObserver: MutationObserver | undefined

  constructor(options: DocumentAttachmentOptions) {
    this.document = options.document
    this.viewport = options.viewport
    this.unsupportedCss = options.unsupportedCss
    this.textMeasurer = options.textMeasurer
    this.stylesheets = options.stylesheets
    patchDomApis(this)
    this.mutationObserver = observeMutations(this.document, () => {
      this.dirty = true
    })
  }

  detach(): void {
    if (this.detached) {
      return
    }

    this.mutationObserver?.disconnect()
    this.mutationObserver = undefined
    unpatchDomApis(this)
    this.detached = true
  }

  markDirty(): void {
    this.assertAttached()
    this.dirty = true
  }

  recompute(): void {
    this.assertAttached()
    const scroll = readScrollOffset(this.document)

    this.snapshot = computeTaffyDocumentLayout(
      this.document,
      this.viewport,
      scroll,
      this.unsupportedCss,
      this.textMeasurer,
      this.stylesheets,
    )
    this.snapshotScroll = scroll
    this.stylesheetFingerprint = documentStylesheetFingerprint(this.document)
    this.dirty = false
  }

  getBoundingClientRect(element: Element): DOMRect {
    const snapshot = this.getSnapshot()
    return createDomRect(this.document, snapshot.rects.get(element) ?? zeroBox())
  }

  offsetWidth(element: Element): number {
    return roundCssPixel(this.getSnapshot().rects.get(element)?.width ?? 0)
  }

  offsetHeight(element: Element): number {
    return roundCssPixel(this.getSnapshot().rects.get(element)?.height ?? 0)
  }

  clientWidth(element: Element): number {
    return roundCssPixel(this.getSnapshot().clientRects.get(element)?.width ?? 0)
  }

  clientHeight(element: Element): number {
    return roundCssPixel(this.getSnapshot().clientRects.get(element)?.height ?? 0)
  }

  elementFromPoint(x: number, y: number): Element | null {
    return elementFromPointInBoxes(this.getSnapshot().boxes, x, y)
  }

  elementsFromPoint(x: number, y: number): Element[] {
    return elementsFromPointInBoxes(this.getSnapshot().boxes, x, y)
  }

  receivesPointerAtCenter(element: Element): boolean {
    const rect = this.getBoundingClientRect(element)
    const top = this.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return top === element || Boolean(top && element.contains(top))
  }

  debug(): string {
    const snapshot = this.getSnapshot()

    return snapshot.boxes
      .map((box) => {
        const label = describeElement(box.element)
        const blocker = findCenterBlocker(box.element, box, snapshot.boxes)
        const blockedBy = blocker ? ` BLOCKED_BY=${describeElement(blocker)}` : ''
        return `${label} x=${formatNumber(box.x)} y=${formatNumber(box.y)} w=${formatNumber(box.width)} h=${formatNumber(box.height)} z=${box.zIndex} pe=${box.pointerEvents} visibility=${box.visibility}${blockedBy}`
      })
      .join('\n')
  }

  private getSnapshot(): LayoutSnapshot {
    this.assertAttached()

    if (
      this.dirty ||
      !this.snapshot ||
      this.stylesheetFingerprint !== documentStylesheetFingerprint(this.document) ||
      !sameScrollOffset(this.snapshotScroll, readScrollOffset(this.document)) ||
      hasElementScrollChanged(this.snapshot.elementScrolls)
    ) {
      this.recompute()
    }

    const snapshot = this.snapshot

    if (!snapshot) {
      throw new Error('Layout snapshot was not computed')
    }

    return snapshot
  }

  private assertAttached(): void {
    if (this.detached) {
      throw new Error('Cannot use a detached layout engine attachment')
    }
  }
}

function readScrollOffset(document: Document): ScrollOffset {
  const view = document.defaultView

  return {
    x: view?.scrollX ?? document.documentElement?.scrollLeft ?? 0,
    y: view?.scrollY ?? document.documentElement?.scrollTop ?? 0,
  }
}

function sameScrollOffset(a: ScrollOffset | undefined, b: ScrollOffset): boolean {
  return Boolean(a && a.x === b.x && a.y === b.y)
}

function hasElementScrollChanged(scrolls: ReadonlyMap<Element, ScrollOffset>): boolean {
  for (const [element, scroll] of scrolls) {
    if (!sameScrollOffset(scroll, { x: element.scrollLeft, y: element.scrollTop })) {
      return true
    }
  }

  return false
}

function roundCssPixel(value: number): number {
  return Math.round(value)
}

function findCenterBlocker(element: Element, box: { x: number; y: number; width: number; height: number }, boxes: LayoutSnapshot['boxes']): Element | null {
  const top = elementFromPointInBoxes(boxes, box.x + box.width / 2, box.y + box.height / 2)

  if (!top || top === element || element.contains(top)) {
    return null
  }

  return top
}

function describeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : ''
  const className =
    typeof element.className === 'string' && element.className
      ? `.${element.className.trim().replace(/\s+/g, '.')}`
      : ''

  return `${element.tagName.toLowerCase()}${id}${className}`
}

function formatNumber(value: number): string {
  return Object.is(value, -0) ? '0' : String(Number(value.toFixed(4)))
}

function observeMutations(document: Document, markDirty: () => void): MutationObserver | undefined {
  const MutationObserver = document.defaultView?.MutationObserver
  const root = document.documentElement

  if (!MutationObserver || !root) {
    return undefined
  }

  const observer = new MutationObserver(markDirty)

  observer.observe(root, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  })

  return observer
}
