import { PropertyPatches } from '../../api/attachment/property-patches.ts';

// CSSOM edits do not emit MutationObserver records. Track the public mutation
// methods and setters once, then check a revision without serializing rules.
// Weak keys avoid retaining sheets, rules, or detached documents.
type Revision = {
  value: number;
  structure: number;
  tracked: number;
  reliable: boolean;
  objects: Set<object>;
  media: Set<MediaList>;
  scopes: Set<TrackingScope>;
};
const revisions = new WeakMap<object, Revision>();
type TrackingScope = {
  patches: PropertyPatches;
  targets: WeakMap<object, boolean>;
  revisions: Set<Revision>;
};
const documentScopes = new WeakMap<Document, TrackingScope>();
const standaloneScope = createScope();
function createScope(): TrackingScope {
  return {
    patches: new PropertyPatches(),
    targets: new WeakMap(),
    revisions: new Set(),
  };
}

export function releaseStylesheetRevisions(document: Document): void {
  const scope = documentScopes.get(document);
  if (!scope) return;
  scope.patches.restore();
  for (const revision of scope.revisions) {
    revision.scopes.delete(scope);
    if (revision.scopes.size === 0) {
      for (const object of revision.objects) revisions.delete(object);
      revision.objects.clear();
      revision.media.clear();
    }
  }
  scope.revisions.clear();
  documentScopes.delete(document);
}
const structuralMutators = new Set([
  'insertRule',
  'deleteRule',
  'addRule',
  'removeRule',
  'replace',
  'replaceSync',
  'appendRule',
]);
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

export function stylesheetRevision(
  sheet: CSSStyleSheet,
  document?: Document,
): number | undefined {
  let scope = document ? documentScopes.get(document) : standaloneScope;
  if (!scope) {
    scope = createScope();
    if (document) documentScopes.set(document, scope);
  }
  let revision = revisions.get(sheet);
  if (!revision) {
    revision = {
      value: 0,
      structure: 0,
      tracked: -1,
      reliable: true,
      objects: new Set(),
      media: new Set(),
      scopes: new Set([scope]),
    };
    trackObject(sheet, revision);
  }
  scope.revisions.add(revision);
  if (!revision.scopes.has(scope)) {
    revision.scopes.add(scope);
    for (const object of revision.objects) {
      if (revision.media.has(object as MediaList))
        patchMedia(object as MediaList, revision, scope);
      else patchObject(object, revision, scope);
    }
  }
  if (revision.tracked !== revision.structure) {
    try {
      trackRules(sheet.cssRules, revision);
      revision.tracked = revision.structure;
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
  revision.objects.add(object);
  for (const scope of revision.scopes) patchObject(object, revision, scope);
}

function patchObject(
  object: object,
  revision: Revision,
  scope: TrackingScope,
): void {
  for (
    let target: object | null = object;
    target && target !== Object.prototype;
    target = Object.getPrototypeOf(target)
  ) {
    const reliable = scope.targets.get(target);
    if (reliable !== undefined) {
      if (!reliable) revision.reliable = false;
      continue;
    }
    scope.targets.set(target, true);
    for (const key of Object.getOwnPropertyNames(target)) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      if (!descriptor) continue;
      const method = descriptor.value;
      const setter = descriptor.set;
      if (!setter && !(typeof method === 'function' && mutators.has(key)))
        continue;
      try {
        scope.patches.defineProperty(target, key, {
          ...descriptor,
          ...(setter
            ? {
                set(this: object, value: unknown) {
                  setter.call(this, value);
                  const state = revisions.get(this);
                  if (state) {
                    state.value += 1;
                    if (key === 'cssText' && 'cssRules' in this)
                      state.structure += 1;
                  }
                },
              }
            : {
                value(this: object, ...args: unknown[]) {
                  const result: unknown = Reflect.apply(method, this, args);
                  const state = revisions.get(this);
                  if (state) {
                    state.value += 1;
                    if (structuralMutators.has(key)) state.structure += 1;
                    if (
                      key === 'replace' &&
                      result &&
                      typeof (result as Promise<unknown>).then === 'function'
                    ) {
                      void (result as Promise<unknown>).then(
                        () => {
                          state.value += 1;
                          state.structure += 1;
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
        scope.targets.set(target, false);
        revision.reliable = false;
      }
    }
  }
}

function trackMedia(media: MediaList, revision: Revision): void {
  if (revisions.has(media)) return;
  revisions.set(media, revision);
  revision.objects.add(media);
  revision.media.add(media);
  for (const scope of revision.scopes) patchMedia(media, revision, scope);
}

function patchMedia(
  media: MediaList,
  revision: Revision,
  scope: TrackingScope,
): void {
  // happy-dom's MediaList is a proxy that binds setters/methods to its hidden
  // target. Prototype wrappers cannot look that target up in our WeakMap, so
  // install the three public mutation hooks on the list itself instead.
  try {
    for (const key of ['appendMedium', 'deleteMedium'] as const) {
      const method = media[key];
      scope.patches.defineProperty(media, key, {
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
        scope.patches.defineProperty(media, 'mediaText', {
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
