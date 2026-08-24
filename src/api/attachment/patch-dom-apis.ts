import type { DocumentAttachment } from './document-attachment.ts';
import { createResizeObserverConstructor } from './layout-resize-observer.ts';

const attachedDocuments = new WeakMap<Document, DocumentAttachment>();
const patchedWindows = new WeakSet<object>();

export function patchDomApis(attachment: DocumentAttachment): void {
  const document = attachment.document;
  const view = document.defaultView;

  if (!view) {
    throw new Error(
      'Cannot attach layout engine to a document without defaultView',
    );
  }

  const existingAttachment = attachedDocuments.get(document);

  existingAttachment?.detach();
  attachedDocuments.set(document, attachment);

  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value(this: Document, x: number, y: number) {
      return attachmentForDocument(this).elementFromPoint(x, y);
    },
  });

  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value(this: Document, x: number, y: number) {
      return attachmentForDocument(this).elementsFromPoint(x, y);
    },
  });

  patchElementInstanceRects(document);

  Object.defineProperty(view, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: createResizeObserverConstructor(attachment),
  });

  if (patchedWindows.has(view)) {
    return;
  }

  patchedWindows.add(view);

  const elementPrototype = view.Element.prototype;
  const htmlElementPrototype = view.HTMLElement.prototype;

  patchGetBoundingClientRect(elementPrototype);
  patchGetBoundingClientRect(htmlElementPrototype);
  patchGetBoundingClientRect(view.HTMLButtonElement?.prototype);
  patchGetBoundingClientRect(view.HTMLInputElement?.prototype);
  patchGetBoundingClientRect(view.HTMLSelectElement?.prototype);
  patchGetBoundingClientRect(view.HTMLTextAreaElement?.prototype);
  patchScrollIntoView(elementPrototype);
  patchScrollIntoView(htmlElementPrototype);
  patchMatchMedia(view);

  Object.defineProperties(view, {
    innerWidth: {
      configurable: true,
      get: () => attachmentForDocument(document).getViewport().width,
    },
    innerHeight: {
      configurable: true,
      get: () => attachmentForDocument(document).getViewport().height,
    },
  });

  Object.defineProperty(htmlElementPrototype, 'offsetWidth', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetWidth(this);
    },
  });

  Object.defineProperty(htmlElementPrototype, 'offsetHeight', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetHeight(this);
    },
  });

  Object.defineProperty(htmlElementPrototype, 'offsetTop', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetTop(this);
    },
  });

  Object.defineProperty(htmlElementPrototype, 'offsetLeft', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetLeft(this);
    },
  });

  Object.defineProperty(htmlElementPrototype, 'offsetParent', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetParent(this);
    },
  });

  Object.defineProperty(htmlElementPrototype, 'clientWidth', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).clientWidth(this);
    },
  });

  Object.defineProperty(htmlElementPrototype, 'clientHeight', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).clientHeight(this);
    },
  });
}

export function debugLayout(window: { document: Document }): string {
  return attachmentForDocument(window.document).debug();
}

export function unpatchDomApis(attachment: DocumentAttachment): void {
  if (attachedDocuments.get(attachment.document) === attachment) {
    attachedDocuments.delete(attachment.document);
  }
}

function attachmentForElement(element: Element): DocumentAttachment {
  const document = element.ownerDocument;

  if (!document) {
    throw new Error('Cannot query layout for an element without ownerDocument');
  }

  return attachmentForDocument(document);
}

function attachmentForDocument(document: Document): DocumentAttachment {
  const attachment = attachedDocuments.get(document);

  if (!attachment) {
    throw new Error('No layout engine is attached to this document');
  }

  return attachment;
}

function patchGetBoundingClientRect(prototype: object | undefined): void {
  if (!prototype) {
    return;
  }

  Object.defineProperty(prototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: Element) {
      return attachmentForElement(this).getBoundingClientRect(this);
    },
  });
  Object.defineProperty(prototype, 'getClientRects', {
    configurable: true,
    value(this: Element) {
      return attachmentForElement(this).getClientRects(this);
    },
  });
}

function patchElementInstanceRects(document: Document): void {
  for (const element of Array.from(document.getElementsByTagName('*'))) {
    patchGetBoundingClientRect(element);
  }
}

function patchScrollIntoView(prototype: object | undefined): void {
  if (!prototype) {
    return;
  }

  Object.defineProperty(prototype, 'scrollIntoView', {
    configurable: true,
    value(this: Element, arg?: boolean | ScrollIntoViewOptions) {
      attachmentForElement(this).scrollIntoView(this, arg);
    },
  });
}

function patchMatchMedia(view: Window): void {
  const EventTargetConstructor = (
    view as Window & { EventTarget: typeof EventTarget }
  ).EventTarget;

  Object.defineProperty(view, 'matchMedia', {
    configurable: true,
    value(query: string): MediaQueryList {
      const media = String(query);
      const eventTarget = new EventTargetConstructor() as MediaQueryList;

      Object.defineProperties(eventTarget, {
        matches: {
          enumerable: true,
          get: () =>
            attachmentForDocument(view.document).matchesMediaQuery(media),
        },
        media: {
          enumerable: true,
          value: media,
        },
        onchange: {
          configurable: true,
          enumerable: true,
          writable: true,
          value: null,
        },
        addListener: {
          configurable: true,
          value(listener: ((event: MediaQueryListEvent) => void) | null) {
            if (listener) {
              eventTarget.addEventListener('change', listener as EventListener);
            }
          },
        },
        removeListener: {
          configurable: true,
          value(listener: ((event: MediaQueryListEvent) => void) | null) {
            if (listener) {
              eventTarget.removeEventListener(
                'change',
                listener as EventListener,
              );
            }
          },
        },
      });

      return eventTarget;
    },
  });
}
