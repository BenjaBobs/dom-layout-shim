// Cache pure string-derived work without retaining every value seen across a
// long-lived test process. Oversized inputs are deliberately not retained.
export class BoundedCache<T> {
  private readonly entries = new Map<string, T>();
  private readonly evicted = new Set<string>();
  private capacity: number;
  private reuseCount = 0;
  private readonly maxKeyLength: number;
  private readonly maxCapacity: number;
  constructor(
    capacity = 512,
    maxKeyLength = 16_384,
    maxCapacity = capacity * 8,
  ) {
    this.capacity = capacity;
    this.maxKeyLength = maxKeyLength;
    this.maxCapacity = Math.max(capacity, maxCapacity);
  }

  get(key: string): T | undefined {
    return this.entries.get(key);
  }
  set(key: string, value: T): void {
    if (key.length > this.maxKeyLength) return;
    // Remember keys, not values, from recent evictions. Recomputing these keys
    // signals a reusable working set; a stream of unique inputs does not.
    if (this.evicted.delete(key)) {
      this.reuseCount += 1;
      if (this.reuseCount >= Math.ceil(this.capacity / 4)) {
        this.capacity = Math.min(this.capacity * 2, this.maxCapacity);
        this.reuseCount = 0;
      }
    }
    if (!this.entries.has(key) && this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
        if (this.capacity < this.maxCapacity) this.evicted.add(oldest);
      }
    }
    if (this.capacity === this.maxCapacity) this.evicted.clear();
    while (this.evicted.size > this.capacity) {
      const oldest = this.evicted.keys().next().value;
      if (oldest !== undefined) this.evicted.delete(oldest);
    }
    this.entries.set(key, value);
  }
}
