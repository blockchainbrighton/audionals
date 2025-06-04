const handlers = new Map();
export const bus = {
  emit(type, payload) {
    (handlers.get(type) || []).forEach((fn) => fn(payload));
  },
  on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type).delete(fn);
  },
};
