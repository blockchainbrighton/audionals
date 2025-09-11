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

// (Optional) light utilities removed: these are defined in utils.js and unused here
