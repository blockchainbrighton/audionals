// effects/glyph.js
//
// “Glyph‑fill” reveal   (forward = fill‑in, reverse = empty‑out)
//
// Signature is the same as the other effect modules:
//    (ctx, canvas, img, progress)
//
// Internal per‑canvas state (grid, shuffle order, cached img data) is
// stored in a WeakMap so it is created once and garbage‑collected
// when the canvas is gone.

const CELL = 12;                               // px per glyph
const stateMap = new WeakMap();                // canvas ⇒ state

const off = document.createElement('canvas');  // off‑screen for sampling
const offCtx = off.getContext('2d');

function buildGrid(w, h, step) {
  const cols = Math.floor(w / step);
  const rows = Math.floor(h / step);
  const grid = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      grid.push({ x: x * step, y: y * step });
  return { grid, cols, rows, cellW: step, cellH: step };
}

function getState(ctx, canvas, img) {
  let st = stateMap.get(canvas);
  if (st && st.img === img) return st;         // reuse if nothing changed

  // ─── build once ───
  const { width: w, height: h } = canvas;
  const glyphGrid = buildGrid(w, h, CELL);

  // sample the full image into an off‑screen canvas
  off.width = w; off.height = h;
  offCtx.drawImage(img, 0, 0, w, h);
  const srcImgData = offCtx.getImageData(0, 0, w, h);

  // shuffled drawing order (simple random shuffle here)
  const shuffled = [...Array(glyphGrid.grid.length).keys()]
    .sort(() => Math.random() - 0.5);

  st = {
    img,
    glyphGrid,
    shuffledIndices: shuffled,
    srcImgData,
    lastCount: -1            // for quick short‑circuit
  };
  stateMap.set(canvas, st);
  return st;
}

function glyphRender(ctx, canvas, img, p, forward) {
  if (!img) return;

  const st = getState(ctx, canvas, img);
  const { glyphGrid: { grid, cellW, cellH }, shuffledIndices, srcImgData } = st;
  const total = grid.length;

  const showCount = forward
      ? Math.floor(p * total)                 // 0 → full
      : total - Math.floor(p * total);        // full → 0

  if (showCount === st.lastCount) return;     // nothing new to draw
  st.lastCount = showCount;

  const revealed = new Set(shuffledIndices.slice(0, showCount));
  const data = srcImgData.data;
  const w = canvas.width;

  const getPix = (x, y) => ((y * w) + x) * 4;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#aaa';

  for (let i = 0; i < total; i++) {
    const { x, y } = grid[i];
    if (revealed.has(i)) {
      // sample centre pixel for colour
      const cx = Math.min(w - 1, x + (cellW >> 1));
      const cy = Math.min(canvas.height - 1, y + (cellH >> 1));
      const idx = getPix(cx, cy);
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(x, y, cellW, cellH);
    } else {
      ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
    }
  }
}

export const glyphEffects = {
  /** outline → filled */
  glyphFwd(ctx, canvas, img, progress) { glyphRender(ctx, canvas, img, progress, true); },
  /** filled → outline */
  glyphRev(ctx, canvas, img, progress) { glyphRender(ctx, canvas, img, progress, false); }
};

export default glyphEffects;
