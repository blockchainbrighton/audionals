// shapes.js
// Registry helpers for shape keys + labels. Works across components.
// Public surface: humKey, shapeList, shapeCount, allKeys, shapeLabel
// v20.2 - Removed duplicate constants, import from utils.js

import { TAU, clamp } from './utils.js';

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

// Re-export utilities for backward compatibility
export { TAU, clamp };
