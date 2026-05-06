import type { DomainAdapter } from '../types.js';

export class DomainRegistry {
  private readonly adapters = new Map<string, DomainAdapter>();
  private readonly disabled = new Set<string>();

  register(adapter: DomainAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Domain '${adapter.name}' already registered`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  unregister(name: string): boolean {
    this.disabled.delete(name);
    return this.adapters.delete(name);
  }

  enable(name: string): void {
    this.disabled.delete(name);
  }

  disable(name: string): void {
    this.disabled.add(name);
  }

  isActive(name: string): boolean {
    return this.adapters.has(name) && !this.disabled.has(name);
  }

  get(name: string): DomainAdapter | undefined {
    if (!this.isActive(name)) return undefined;
    return this.adapters.get(name);
  }

  list(): Array<{ adapter: DomainAdapter; active: boolean }> {
    return Array.from(this.adapters.values()).map((adapter) => ({
      adapter,
      active: !this.disabled.has(adapter.name),
    }));
  }
}
