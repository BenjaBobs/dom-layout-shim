type Patch = {
  target: object;
  key: PropertyKey;
  original: PropertyDescriptor | undefined;
  owners: Set<PropertyPatches>;
};

const patches = new WeakMap<object, Map<PropertyKey, Patch>>();

/** Reference-count patches because DOM harnesses can share prototype objects. */
export class PropertyPatches {
  private readonly owned = new Set<Patch>();

  defineProperty(
    target: object,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
  ): void {
    let properties = patches.get(target);
    let patch = properties?.get(key);
    if (!patch) {
      const original = Object.getOwnPropertyDescriptor(target, key);
      Object.defineProperty(target, key, descriptor);
      patch = { target, key, original, owners: new Set() };
      properties ??= new Map();
      properties.set(key, patch);
      patches.set(target, properties);
    }
    patch.owners.add(this);
    this.owned.add(patch);
  }

  defineProperties(target: object, descriptors: PropertyDescriptorMap): void {
    for (const key of Reflect.ownKeys(descriptors))
      this.defineProperty(
        target,
        key,
        descriptors[key as keyof typeof descriptors],
      );
  }

  restore(): void {
    for (const patch of [...this.owned].reverse()) {
      patch.owners.delete(this);
      if (patch.owners.size) continue;
      if (patch.original)
        Object.defineProperty(patch.target, patch.key, patch.original);
      else Reflect.deleteProperty(patch.target, patch.key);
      patches.get(patch.target)?.delete(patch.key);
    }
    this.owned.clear();
  }
}

export function originalPropertyDescriptor(
  target: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  for (
    let owner: object | null = target;
    owner;
    owner = Object.getPrototypeOf(owner)
  ) {
    const patch = patches.get(owner)?.get(key);
    const descriptor = patch
      ? patch.original
      : Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor) return descriptor;
  }
  return undefined;
}
