// shapes.js
// Registry helpers for shape keys + labels. Works across components.
// Public surface: humKey, shapeList, shapeCount, allKeys, shapeLabel

export const humKey = (app) => app?.humKey || 'hum';

export const shapeList = (app) => {
  const fromCanvas = app?._canvas?.listShapes?.();
  const base = (Array.isArray(fromCanvas) && fromCanvas.length)
    ? fromCanvas
    : (Array.isArray(app?.shapes) ? app.shapes : []);
  return base.filter(k => k !== humKey(app));
};

export const shapeCount = (app) => shapeList(app).length;
export const allKeys = (app) => [humKey(app), ...shapeList(app)];

export const shapeLabel = (app, key) => {
  if (!key) return '';
  const map = app?.shapeLabels || {};
  return map[key] ?? (key[0]?.toUpperCase?.() + key.slice(1));
};

// (Optional) light utilities used elsewhere if desired
// Reuse shared TAU and clamp helpers from the utilities module rather
// than redefining them here. Re‑export under the same names to
// preserve the public API of this module. See `shared/utils.js` for
// the canonical definitions.
import { TAU as _TAU, clamp as _clamp } from './shared/utils.js';
export const TAU = _TAU;
export const clamp = _clamp;
