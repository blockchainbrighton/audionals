import { Window } from 'happy-dom';

const GLOBAL_KEYS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'requestAnimationFrame',
  'cancelAnimationFrame'
];

function defineGlobal(key, value) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}

function restoreGlobal(key, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
  } else {
    delete globalThis[key];
  }
}

export function withDom(fn) {
  const descriptors = GLOBAL_KEYS.reduce((acc, key) => {
    acc[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    return acc;
  }, {});

  const happyWindow = new Window();
  const { document } = happyWindow;

  defineGlobal('window', happyWindow);
  defineGlobal('document', document);
  defineGlobal('navigator', happyWindow.navigator);
  defineGlobal('HTMLElement', happyWindow.HTMLElement);
  defineGlobal('requestAnimationFrame', happyWindow.requestAnimationFrame.bind(happyWindow));
  defineGlobal('cancelAnimationFrame', happyWindow.cancelAnimationFrame.bind(happyWindow));

  try {
    return fn({ window: happyWindow, document });
  } finally {
    happyWindow.happyDOM?.cancelAsync?.();
    happyWindow.close();
    GLOBAL_KEYS.forEach(key => restoreGlobal(key, descriptors[key]));
  }
}
