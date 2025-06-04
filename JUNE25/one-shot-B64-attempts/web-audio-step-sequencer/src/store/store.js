/** Lightweight observable store: createStore(initialState) */
export function createStore(initialState) {
  let state = structuredClone(initialState);
  const listeners = new Map();

  function setState(partial) {
    const next = { ...state, ...partial };
    if (next === state) return;
    const old = state;
    state = next;
    // Diff keys and notify only when slice changed
    listeners.forEach((cbs, key) => {
      if (old[key] !== next[key]) cbs.forEach((cb) => cb(next[key]));
    });
  }

  function observe(key, cb) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(cb);
    return () => listeners.get(key).delete(cb);
  }

  function getState(key) {
    return key ? state[key] : state;
  }

  return { setState, observe, getState };
}
