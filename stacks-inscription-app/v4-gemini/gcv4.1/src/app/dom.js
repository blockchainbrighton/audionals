export function byId(id) {
  return document.getElementById(id);
}

export function mustById(id) {
  const el = byId(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

export function setHidden(elOrId, hidden) {
  const el = typeof elOrId === 'string' ? byId(elOrId) : elOrId;
  if (!el) return;
  el.classList.toggle('hidden', Boolean(hidden));
}

export function setText(elOrId, text) {
  const el = typeof elOrId === 'string' ? byId(elOrId) : elOrId;
  if (!el) return;
  el.innerText = text || '';
}

export function setHtml(elOrId, html) {
  const el = typeof elOrId === 'string' ? byId(elOrId) : elOrId;
  if (!el) return;
  el.innerHTML = html || '';
}

export function on(elOrId, eventName, handler, options) {
  const el = typeof elOrId === 'string' ? byId(elOrId) : elOrId;
  if (!el) return () => {};
  el.addEventListener(eventName, handler, options);
  return () => el.removeEventListener(eventName, handler, options);
}

