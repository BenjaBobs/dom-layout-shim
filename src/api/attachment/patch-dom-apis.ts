import type { DocumentAttachment } from './document-attachment.ts';
import { createIntersectionObserverConstructor } from './layout-intersection-observer.ts';
import { createResizeObserverConstructor } from './layout-resize-observer.ts';
import {
  originalPropertyDescriptor,
  PropertyPatches,
} from './property-patches.ts';

const attachedDocuments = new WeakMap<Document, DocumentAttachment>();
const attachmentPatches = new WeakMap<DocumentAttachment, PropertyPatches>();

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
  const patches = new PropertyPatches();
  attachmentPatches.set(attachment, patches);

  patches.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value(this: Document, x: number, y: number) {
      return attachmentForDocument(this).elementFromPoint(x, y);
    },
  });

  patches.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value(this: Document, x: number, y: number) {
      return attachmentForDocument(this).elementsFromPoint(x, y);
    },
  });

  patchElementInstanceRects(document, patches);

  patches.defineProperty(view, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: createResizeObserverConstructor(attachment),
  });
  patches.defineProperty(view, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: createIntersectionObserverConstructor(attachment),
  });

  attachment.setScrollTracking(
    patchScrollOffsets(view.Element.prototype, patches),
  );

  const elementPrototype = view.Element.prototype;
  const htmlElementPrototype = view.HTMLElement.prototype;

  patchGetBoundingClientRect(elementPrototype, patches);
  patchGetBoundingClientRect(htmlElementPrototype, patches);
  patchGetBoundingClientRect(view.HTMLButtonElement?.prototype, patches);
  patchGetBoundingClientRect(view.HTMLInputElement?.prototype, patches);
  patchGetBoundingClientRect(view.HTMLSelectElement?.prototype, patches);
  patchGetBoundingClientRect(view.HTMLTextAreaElement?.prototype, patches);
  patchScrollIntoView(elementPrototype, patches);
  patchScrollIntoView(htmlElementPrototype, patches);
  patchMatchMedia(view, patches);

  patches.defineProperties(view, {
    innerWidth: {
      configurable: true,
      get: () => attachmentForDocument(document).getViewport().width,
      set: () => rejectViewportAssignment('innerWidth'),
    },
    innerHeight: {
      configurable: true,
      get: () => attachmentForDocument(document).getViewport().height,
      set: () => rejectViewportAssignment('innerHeight'),
    },
  });

  patchElementProperty(patches, htmlElementPrototype, 'offsetWidth', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetWidth(this);
    },
  });

  patchElementProperty(patches, htmlElementPrototype, 'offsetHeight', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetHeight(this);
    },
  });

  patchElementProperty(patches, htmlElementPrototype, 'offsetTop', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetTop(this);
    },
  });

  patchElementProperty(patches, htmlElementPrototype, 'offsetLeft', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetLeft(this);
    },
  });

  patchElementProperty(patches, htmlElementPrototype, 'offsetParent', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).offsetParent(this);
    },
  });

  for (const prototype of [elementPrototype, htmlElementPrototype]) {
    const descriptors: PropertyDescriptorMap = {
      scrollWidth: {
        configurable: true,
        get(this: Element) {
          return attachmentForElement(this).scrollWidth(this);
        },
      },
      scrollHeight: {
        configurable: true,
        get(this: Element) {
          return attachmentForElement(this).scrollHeight(this);
        },
      },
    };
    for (const [key, descriptor] of Object.entries(descriptors))
      patchElementProperty(patches, prototype, key, descriptor);
  }

  patchElementProperty(patches, htmlElementPrototype, 'clientWidth', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).clientWidth(this);
    },
  });

  patchElementProperty(patches, htmlElementPrototype, 'clientHeight', {
    configurable: true,
    get(this: Element) {
      return attachmentForElement(this).clientHeight(this);
    },
  });
}

export function isDocumentAttached(document: Document): boolean {
  return attachedDocuments.has(document);
}

export function debugLayout(window: { document: Document }): string {
  return attachmentForDocument(window.document).debug();
}

export function unpatchDomApis(attachment: DocumentAttachment): void {
  if (attachedDocuments.get(attachment.document) === attachment) {
    attachmentPatches.get(attachment)?.restore();
    attachmentPatches.delete(attachment);
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

function patchGetBoundingClientRect(
  prototype: object | undefined,
  patches: PropertyPatches,
): void {
  if (!prototype) {
    return;
  }

  patchElementProperty(patches, prototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: Element) {
      return attachmentForElement(this).getBoundingClientRect(this);
    },
  });
  patchElementProperty(patches, prototype, 'getClientRects', {
    configurable: true,
    value(this: Element) {
      return attachmentForElement(this).getClientRects(this);
    },
  });
}

function patchElementInstanceRects(
  document: Document,
  patches: PropertyPatches,
): void {
  for (const element of Array.from(document.getElementsByTagName('*'))) {
    patchGetBoundingClientRect(element, patches);
  }
}

function patchScrollIntoView(
  prototype: object | undefined,
  patches: PropertyPatches,
): void {
  if (!prototype) {
    return;
  }

  patchElementProperty(patches, prototype, 'scrollIntoView', {
    configurable: true,
    value(this: Element, arg?: boolean | ScrollIntoViewOptions) {
      attachmentForElement(this).scrollIntoView(this, arg);
    },
  });
}

function patchMatchMedia(view: Window, patches: PropertyPatches): void {
  const EventTargetConstructor = (
    view as Window & { EventTarget: typeof EventTarget }
  ).EventTarget;

  patches.defineProperty(view, 'matchMedia', {
    configurable: true,
    value(query: string): MediaQueryList {
      const media = String(query);
      const eventTarget = new EventTargetConstructor() as MediaQueryList;

      patches.defineProperties(eventTarget, {
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

function patchScrollOffsets(
  prototype: object,
  patches: PropertyPatches,
): boolean {
  let reliable = true;
  for (const key of ['scrollLeft', 'scrollTop'] as const) {
    let owner: object | null = prototype;
    while (owner && !Object.getOwnPropertyDescriptor(owner, key))
      owner = Object.getPrototypeOf(owner);
    const descriptor = owner
      ? Object.getOwnPropertyDescriptor(owner, key)
      : undefined;
    if (
      !owner ||
      !descriptor?.set ||
      !descriptor.get ||
      !descriptor.configurable
    ) {
      reliable = false;
      continue;
    }
    const setter = descriptor.set;
    const getter = descriptor.get;
    patches.defineProperty(owner, key, {
      ...descriptor,
      set(this: Element, value: number) {
        const before = getter.call(this);
        setter.call(this, value);
        if (getter.call(this) !== before)
          attachedDocuments.get(this.ownerDocument)?.markScrollDirty();
      },
    });
  }
  for (const key of ['scroll', 'scrollTo', 'scrollBy']) {
    let owner: object | null = prototype;
    while (owner && !Object.getOwnPropertyDescriptor(owner, key))
      owner = Object.getPrototypeOf(owner);
    const descriptor = owner
      ? Object.getOwnPropertyDescriptor(owner, key)
      : undefined;
    if (!descriptor) continue;
    if (
      !owner ||
      !descriptor.configurable ||
      typeof descriptor.value !== 'function'
    ) {
      reliable = false;
      continue;
    }
    const method = descriptor.value;
    patches.defineProperty(owner, key, {
      ...descriptor,
      value(this: Element, ...args: unknown[]) {
        const result: unknown = Reflect.apply(method, this, args);
        attachedDocuments.get(this.ownerDocument)?.markScrollDirty();
        return result;
      },
    });
  }
  return reliable;
}

function rejectViewportAssignment(property: string): never {
  throw new TypeError(
    `Cannot assign window.${property} while a layout engine is attached. Use the attachment returned by attachLayoutEngine(): attachment.setViewport({ width, height }).`,
  );
}

function patchElementProperty(
  patches: PropertyPatches,
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor,
): void {
  const original = originalPropertyDescriptor(target, key);
  const wrapped = { ...descriptor };
  // Some harness prototypes are shared across windows. Keep their wrappers
  // while another window is attached, but use native behavior for detached DOMs.
  for (const slot of ['value', 'get', 'set'] as const) {
    const method = descriptor[slot];
    if (typeof method !== 'function') continue;
    wrapped[slot] = function (this: Element, ...args: unknown[]) {
      if (attachedDocuments.has(this.ownerDocument))
        return Reflect.apply(method, this, args);
      const fallback = original?.[slot];
      return typeof fallback === 'function'
        ? Reflect.apply(fallback, this, args)
        : original?.value;
    };
  }
  patches.defineProperty(target, key, wrapped);
}
