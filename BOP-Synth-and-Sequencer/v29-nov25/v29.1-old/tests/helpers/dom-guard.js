export function withDom(fn) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;

  globalThis.window = globalThis;
  globalThis.document = {
    createElement() {
      return {};
    }
  };

  try {
    return fn();
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
}
