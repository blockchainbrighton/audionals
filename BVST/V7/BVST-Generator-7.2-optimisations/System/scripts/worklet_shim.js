// Minimal polyfills for AudioWorklet global scope where some browser APIs may be missing.
(() => {
  const g = typeof globalThis !== 'undefined' ? globalThis : self;

  if (typeof g.TextDecoder === 'undefined') {
    g.TextDecoder = class TextDecoder {
      constructor(_label = 'utf-8', _options = {}) {}
      decode(bytes) {
        if (!bytes) return '';
        let arr = bytes;
        if (bytes.buffer) arr = new Uint8Array(bytes.buffer ? bytes.buffer : bytes);
        let out = '';
        for (let i = 0; i < arr.length; i++) {
          out += String.fromCharCode(arr[i]);
        }
        return out;
      }
    };
  }

  if (typeof g.TextEncoder === 'undefined') {
    g.TextEncoder = class TextEncoder {
      constructor(_label = 'utf-8') {}
      encode(str = '') {
        const buf = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          buf[i] = str.charCodeAt(i) & 0xff;
        }
        return buf;
      }
    };
  }
})();
