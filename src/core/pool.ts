export class Pool<T> {
  private free: T[] = [];
  private active = new Set<T>();

  constructor(private readonly make: () => T) {}

  acquire(): T {
    const item = this.free.pop() ?? this.make();
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (this.active.delete(item)) this.free.push(item);
  }

  get activeCount(): number { return this.active.size; }
}
