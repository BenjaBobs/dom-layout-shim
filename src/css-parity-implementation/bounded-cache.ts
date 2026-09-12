// Cache pure string-derived work without retaining every value seen across a
// long-lived test process. Oversized inputs are deliberately not retained.
export class BoundedCache<T> {
  private readonly entries = new Map<string, T>();
  private readonly capacity: number;
  private readonly maxKeyLength: number;
  constructor(capacity = 512, maxKeyLength = 16_384) {
    this.capacity = capacity;
    this.maxKeyLength = maxKeyLength;
  }

  get(key: string): T | undefined {
    return this.entries.get(key);
  }
  set(key: string, value: T): void {
    if (key.length > this.maxKeyLength) return;
    if (!this.entries.has(key) && this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, value);
  }
}
