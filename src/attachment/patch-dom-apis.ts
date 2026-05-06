import type { DocumentAttachment } from './document-attachment.ts'

const attachedDocuments = new WeakMap<Document, DocumentAttachment>()
const patchedWindows = new WeakSet<object>()

export function patchDomApis(attachment: DocumentAttachment): void {
  const document = attachment.document
  const view = document.defaultView

  if (!view) {
    throw new Error('Cannot attach layout engine to a document without defaultView')
  }

  const existingAttachment = attachedDocuments.get(document)

  existingAttachment?.detach()
  attachedDocuments.set(document, attachment)

  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value(this: Document, x: number, y: number) {
      return attachmentForDocument(this).elementFromPoint(x, y)
    },
  })

  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value(this: Document, x: number, y: number) {
      return attachmentForDocument(this).elementsFromPoint(x, y)
    },
  })

  if (patchedWindows.has(view)) {
    return
  }

  patchedWindows.add(view)

  const elementPrototype = view.Element.prototype
  const htmlElementPrototype = view.HTMLElement.prototype

  Object.defineProperty(elementPrototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: Element) {
      return attachmentForElement(this).getBoundingClientRect(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'offsetWidth', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetWidth(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'offsetHeight', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetHeight(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'clientWidth', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).clientWidth(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'clientHeight', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).clientHeight(this)
    },
  })
}

export function debugLayout(window: { document: Document }): string {
  return attachmentForDocument(window.document).debug()
}

export function unpatchDomApis(attachment: DocumentAttachment): void {
  if (attachedDocuments.get(attachment.document) === attachment) {
    attachedDocuments.delete(attachment.document)
  }
}

function attachmentForElement(element: Element): DocumentAttachment {
  const document = element.ownerDocument

  if (!document) {
    throw new Error('Cannot query layout for an element without ownerDocument')
  }

  return attachmentForDocument(document)
}

function attachmentForDocument(document: Document): DocumentAttachment {
  const attachment = attachedDocuments.get(document)

  if (!attachment) {
    throw new Error('No layout engine is attached to this document')
  }

  return attachment
}
