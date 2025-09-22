type Listener = (...args: unknown[]) => void;

export default class SimpleEventEmitter {
  private readonly events = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): this {
    const existing = this.events.get(event);
    if (existing) {
      existing.add(listener);
    } else {
      this.events.set(event, new Set([listener]));
    }
    return this;
  }

  once(event: string, listener: Listener): this {
    const wrapper: Listener = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  off(event: string, listener: Listener): this {
    const existing = this.events.get(event);
    if (existing) {
      existing.delete(listener);
      if (existing.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }
    listeners.forEach((listener) => listener(...args));
    return true;
  }
}
