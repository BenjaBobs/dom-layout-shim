import type { DocumentAttachment } from './document-attachment.ts'

export type DomApiPatch = {
  restore(): void
}

export function patchDomApis(attachment: DocumentAttachment): DomApiPatch {
  const document = attachment.document
  const view = document.defaultView

  if (!view) {
    throw new Error('Cannot attach layout engine to a document without defaultView')
  }

  const elementPrototype = view.Element.prototype
  const htmlElementPrototype = view.HTMLElement.prototype
  const originalGetBoundingClientRect = elementPrototype.getBoundingClientRect
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(htmlElementPrototype, 'offsetWidth')
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(htmlElementPrototype, 'offsetHeight')
  const originalClientWidth = Object.getOwnPropertyDescriptor(htmlElementPrototype, 'clientWidth')
  const originalClientHeight = Object.getOwnPropertyDescriptor(htmlElementPrototype, 'clientHeight')
  const originalElementFromPoint = document.elementFromPoint
  const originalElementsFromPoint = document.elementsFromPoint

  Object.defineProperty(elementPrototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: Element) {
      return attachment.getBoundingClientRect(this)
    },
  })

  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value(x: number, y: number) {
      return attachment.elementFromPoint(x, y)
    },
  })

  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value(x: number, y: number) {
      return attachment.elementsFromPoint(x, y)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'offsetWidth', {
    configurable: true,
    get(this: Element) {
      return attachment.offsetWidth(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'offsetHeight', {
    configurable: true,
    get(this: Element) {
      return attachment.offsetHeight(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'clientWidth', {
    configurable: true,
    get(this: Element) {
      return attachment.clientWidth(this)
    },
  })

  Object.defineProperty(htmlElementPrototype, 'clientHeight', {
    configurable: true,
    get(this: Element) {
      return attachment.clientHeight(this)
    },
  })

  return {
    restore() {
      Object.defineProperty(elementPrototype, 'getBoundingClientRect', {
        configurable: true,
        value: originalGetBoundingClientRect,
      })
      restoreProperty(htmlElementPrototype, 'offsetWidth', originalOffsetWidth)
      restoreProperty(htmlElementPrototype, 'offsetHeight', originalOffsetHeight)
      restoreProperty(htmlElementPrototype, 'clientWidth', originalClientWidth)
      restoreProperty(htmlElementPrototype, 'clientHeight', originalClientHeight)

      if (originalElementFromPoint) {
        Object.defineProperty(document, 'elementFromPoint', {
          configurable: true,
          value: originalElementFromPoint,
        })
      } else {
        delete (document as Partial<Document>).elementFromPoint
      }

      if (originalElementsFromPoint) {
        Object.defineProperty(document, 'elementsFromPoint', {
          configurable: true,
          value: originalElementsFromPoint,
        })
      } else {
        delete (document as Partial<Document>).elementsFromPoint
      }
    },
  }
}

function restoreProperty(
  prototype: HTMLElement,
  property: 'offsetWidth' | 'offsetHeight' | 'clientWidth' | 'clientHeight',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(prototype, property, descriptor)
    return
  }

  delete (prototype as Partial<Record<typeof property, unknown>>)[property]
}
