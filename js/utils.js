// Lightweight utilities for deterministic generation and UI helpers
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mapRange = (v, inMin, inMax, outMin, outMax) => outMin + (outMax - outMin) * ((v - inMin) / (inMax - inMin));
export const choose = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
export const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function hslToHex(h, s, l) {
  // h 0-360, s/l 0-100
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function paletteFromSeed(rng) {
  const baseHue = Math.floor(rng() * 360);
  const c1 = hslToHex((baseHue + 0) % 360, 70, 60);
  const c2 = hslToHex((baseHue + 40) % 360, 70, 60);
  const c3 = hslToHex((baseHue + 80) % 360, 70, 60);
  const c4 = hslToHex((baseHue + 200) % 360, 65, 55);
  return { bg: '#0b0d10', fg: '#e6edf3', c1, c2, c3, c4 };
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}