// js/utils/dom.js
// Lightweight DOM helpers (no external deps)

export function loadImg (url, { crossOrigin = 'anonymous' } = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src     = url;
    });
  }
  