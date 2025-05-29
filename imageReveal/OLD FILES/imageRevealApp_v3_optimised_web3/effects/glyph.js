// audional image mixer
// effects/glyph.js
// Glyph‑fill reveal (forward = fill‑in, reverse = empty‑out)

const CELL = 12, HIDE_FRAMES = 10,
      _st = new WeakMap(),
      off = document.createElement('canvas'),
      offCtx = off.getContext('2d');

const _cover = cv => {
  if (cv.__cover) return cv.__cover;
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:'absolute', background:'#000', pointerEvents:'none',
    display:'none', zIndex:2
  });
  const parent = cv.parentElement;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  parent.insertBefore(el, cv.nextSibling);
  return cv.__cover = el;
};
const _sync = (el, cv) => {
  const r = cv.getBoundingClientRect();
  Object.assign(el.style, {
    width:r.width+'px', height:r.height+'px',
    left:cv.offsetLeft+'px', top:cv.offsetTop+'px'
  });
};

const _build = (cv, img) => {
  const { width:w, height:h } = cv,
        grid = [];
  for (let y = 0; y < h; y += CELL)
    for (let x = 0; x < w; x += CELL) grid.push({ x, y });

  off.width = w; off.height = h; offCtx.drawImage(img, 0, 0, w, h);

  return {
    img,
    grid,
    order: Array.from({ length:grid.length }, (_, i) => i).sort(() => Math.random() - .5),
    data: offCtx.getImageData(0, 0, w, h).data,
    lastCnt: -1
  };
};

const _get = (cv, img) => {
  let s = _st.get(cv);
  if (!s || s.img !== img) { s = _build(cv, img); _st.set(cv, s); }
  return s;
};

function _render(ctx, cv, img, p, fwd) {
  if (!img) return;
  const cov = _cover(cv);
  if (fwd && p === 0) cov.__frames = HIDE_FRAMES;
  if (cov.__frames > 0) { cov.__frames--; cov.style.display = 'block'; cv.style.opacity = 0; }
  else { cov.style.display = 'none'; cv.style.opacity = 1; }
  _sync(cov, cv);

  const st = _get(cv, img),
        total = st.grid.length,
        cnt = fwd ? Math.floor(p * total) : total - Math.floor(p * total);

  if (cnt === st.lastCnt && p !== 0 && p !== 1) return;
  st.lastCnt = cnt;

  const reveal = new Set(st.order.slice(0, cnt)),
        { data } = st, w = cv.width;

  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);

  for (let i = 0; i < total; i++) if (reveal.has(i)) {
    const { x, y } = st.grid[i],
          q = ((y + CELL / 2) * w + (x + CELL / 2)) << 2,
          r = data[q], g = data[q + 1], b = data[q + 2], a = data[q + 3] / 255;
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(x, y, CELL, CELL);
  }
}

export const glyphEffects = {
  glyphFwd: (ctx, cv, img, p) => _render(ctx, cv, img, p, true),
  glyphRev: (ctx, cv, img, p) => _render(ctx, cv, img, p, false)
};

export const hideGlyphCover = cv => {
  const c = cv && cv.__cover;
  if (c) { c.style.display = 'none'; delete c.__frames; }
};

export default glyphEffects;
