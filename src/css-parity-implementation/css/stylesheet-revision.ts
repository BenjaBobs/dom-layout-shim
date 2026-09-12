// CSSOM edits do not emit MutationObserver records. Track the public mutation
// methods and setters once, then check a revision without serializing rules.
// Weak keys avoid retaining sheets, rules, or detached documents.
type Revision = { value: number; tracked: number; reliable: boolean };
const revisions = new WeakMap<object, Revision>();
const patched = new WeakMap<object, boolean>();
const mutators = new Set([
  'insertRule',
  'deleteRule',
  'addRule',
  'removeRule',
  'replace',
  'replaceSync',
  'setProperty',
  'removeProperty',
  'appendRule',
  'appendMedium',
  'deleteMedium',
  'set',
  'append',
  'delete',
  'clear',
]);

export function stylesheetRevision(sheet: CSSStyleSheet): number | undefined {
  let revision = revisions.get(sheet);
  if (!revision) {
    revision = { value: 0, tracked: -1, reliable: true };
    trackObject(sheet, revision);
  }
  if (revision.tracked !== revision.value) {
    try {
      trackRules(sheet.cssRules, revision);
      revision.tracked = revision.value;
    } catch {
      // Inaccessible or non-patchable host objects retain the fingerprint path.
      return undefined;
    }
  }
  return revision.reliable ? revision.value : undefined;
}

function trackRules(rules: CSSRuleList, revision: Revision): void {
  for (const rule of Array.from(rules)) {
    trackObject(rule, revision);
    const parts = rule as CSSRule & {
      style?: CSSStyleDeclaration;
      cssRules?: CSSRuleList;
      media?: MediaList;
      styleMap?: object;
    };
    if (parts.style) trackObject(parts.style, revision);
    if (parts.media && typeof parts.media === 'object')
      trackMedia(parts.media, revision);
    if (parts.styleMap) trackObject(parts.styleMap, revision);
    if (parts.cssRules) trackRules(parts.cssRules, revision);
  }
}

function trackObject(object: object, revision: Revision): void {
  if (revisions.has(object)) return;
  revisions.set(object, revision);
  for (
    let target: object | null = object;
    target && target !== Object.prototype;
    target = Object.getPrototypeOf(target)
  ) {
    const reliable = patched.get(target);
    if (reliable !== undefined) {
      if (!reliable) revision.reliable = false;
      continue;
    }
    patched.set(target, true);
    for (const key of Object.getOwnPropertyNames(target)) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      if (!descriptor) continue;
      const method = descriptor.value;
      const setter = descriptor.set;
      if (!setter && !(typeof method === 'function' && mutators.has(key)))
        continue;
      try {
        Object.defineProperty(target, key, {
          ...descriptor,
          ...(setter
            ? {
                set(this: object, value: unknown) {
                  setter.call(this, value);
                  const state = revisions.get(this);
                  if (state) state.value += 1;
                },
              }
            : {
                value(this: object, ...args: unknown[]) {
                  const result: unknown = Reflect.apply(method, this, args);
                  const state = revisions.get(this);
                  if (state) {
                    state.value += 1;
                    if (
                      key === 'replace' &&
                      result &&
                      typeof (result as Promise<unknown>).then === 'function'
                    ) {
                      void (result as Promise<unknown>).then(
                        () => {
                          state.value += 1;
                        },
                        () => {},
                      );
                    }
                  }
                  return result;
                },
              }),
        });
      } catch {
        patched.set(target, false);
        revision.reliable = false;
      }
    }
  }
}

function trackMedia(media: MediaList, revision: Revision): void {
  if (revisions.has(media)) return;
  revisions.set(media, revision);
  // happy-dom's MediaList is a proxy that binds setters/methods to its hidden
  // target. Prototype wrappers cannot look that target up in our WeakMap, so
  // install the three public mutation hooks on the list itself instead.
  try {
    for (const key of ['appendMedium', 'deleteMedium'] as const) {
      const method = media[key];
      Object.defineProperty(media, key, {
        configurable: true,
        writable: true,
        value(value: string) {
          const result = method.call(media, value);
          revision.value += 1;
          return result;
        },
      });
    }
    let prototype: object | null = media;
    while (prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(
        prototype,
        'mediaText',
      );
      if (descriptor?.set) {
        const setter = descriptor.set;
        Object.defineProperty(media, 'mediaText', {
          ...descriptor,
          configurable: true,
          set(value: string) {
            setter.call(media, value);
            revision.value += 1;
          },
        });
        return;
      }
      prototype = Object.getPrototypeOf(prototype);
    }
    revision.reliable = false;
  } catch {
    revision.reliable = false;
  }
}
