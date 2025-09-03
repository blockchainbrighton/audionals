// engine/shapes.js
// Shape registry + helpers factored for reuse by app/canvas/engine.
//
// All helpers accept `app` so they work across components.
// Keeping defaults identical to existing behavior.
export const humKey = (app) => app?.humKey || 'hum';

export const shapeList = (app) => {
  const fromCanvas = app?._canvas?.listShapes?.();
  const base = Array.isArray(fromCanvas) && fromCanvas.length
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
