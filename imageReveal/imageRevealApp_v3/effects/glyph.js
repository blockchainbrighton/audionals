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

/* ─── how long to cover the canvas (frames) ───────────────────────── */
const HIDE_FRAMES = 10;        // tweak to taste (≈ 5 frames ≈ 83 ms @60 fps)

/* ─── per‑canvas black overlay; pointer‑events: none so clicks pass ─ */
/* ─── per‑canvas black overlay – sized to the canvas on demand ───── */
function getCover(canvas) {
    if (canvas.__glyphCover) return canvas.__glyphCover;
  
    /* create + insert as sibling so it can absolutely–overlay the canvas */
    const cover = document.createElement('div');
    Object.assign(cover.style, {
      position:        'absolute',
      background:      '#000',
      pointerEvents:   'none',  // clicks go through
      display:         'none',
      zIndex:          2        // sit above the canvas
    });
  
    const parent = canvas.parentElement;
    if (getComputedStyle(parent).position === 'static')
      parent.style.position = 'relative';       // becomes containing block
  
    parent.insertBefore(cover, canvas.nextSibling);
    canvas.__glyphCover = cover;
    return cover;
  }
  
  /* helper sets cover’s size + position to exactly match the canvas */
  function syncCoverRect(cover, canvas) {
    const rect = canvas.getBoundingClientRect();
    cover.style.width  = rect.width  + 'px';
    cover.style.height = rect.height + 'px';
    cover.style.left   = canvas.offsetLeft + 'px';
    cover.style.top    = canvas.offsetTop  + 'px';
  }

function buildGrid(w, h, step) {
  const cols = Math.floor(w / step);
  const rows = Math.floor(h / step);
  const grid = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      grid.push({ x: x * step, y: y * step });
  return { grid, cols, rows, cellW: step, cellH: step };
}

/* ─── tiny helper: toggle canvas visibility ──────────────────────── */
function setHidden(el, hide = true) {
    el.style.visibility = hide ? 'hidden' : 'visible';
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
    if (!img) {
        // Ensure canvas is hidden and cover is hidden if there's no image
        if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
        const existingCover = canvas.__glyphCover; // Use existing property
        if (existingCover && existingCover.style.display !== 'none') {
            existingCover.style.display = 'none';
        }
        return;
    }

    const cover = getCover(canvas); // Ensures cover div is created if needed

    // --- Manage canvas opacity and cover visibility ---
    if (forward) {
        if (p === 0) { // First frame of forward animation
            // Canvas is already opacity: 0 due to CSS or previous state.
            // Explicitly set opacity: 0 to ensure it, in case something else changed it.
            if (canvas.style.opacity !== '0') canvas.style.opacity = '0';

            syncCoverRect(cover, canvas);
            if (cover.style.display !== 'block') cover.style.display = 'block';
            cover.__framesLeft = HIDE_FRAMES;
        } else { // Subsequent frames of forward animation (p > 0)
            // Check if cover is active
            if (cover.__framesLeft !== undefined && cover.__framesLeft > 0) {
                cover.__framesLeft--;
                // Cover is still active, canvas MUST remain transparent
                if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
            } else {
                // Cover period is over (or was never active for this part)
                if (cover.style.display !== 'none') cover.style.display = 'none';
                if (cover.__framesLeft !== undefined) delete cover.__framesLeft; // Clean up state

                // Now it's safe to make the canvas visible
                if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
            }
        }
    } else { // Reverse animation or other states (e.g., idle after effect)
        if (cover.style.display !== 'none') cover.style.display = 'none'; // No cover in reverse
        if (canvas.__glyphCover && canvas.__glyphCover.__framesLeft !== undefined) { // Check __glyphCover exists
             delete canvas.__glyphCover.__framesLeft; // Clean up state
        }


        // For reverse, the effect itself handles drawing fewer/more glyphs.
        // The canvas itself should be opaque to show these glyphs.
        if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
    }

    // --- Original glyph drawing logic (remains the same) ---
    const st = getState(ctx, canvas, img);
    const { glyphGrid: { grid, cellW, cellH }, shuffledIndices, srcImgData } = st;
    const total = grid.length;

    const showCount = forward
        ? Math.floor(p * total)
        : total - Math.floor(p * total);

    if (showCount === st.lastCount && p !==0 && p !==1 ) return; // Avoid re-render if count is same, but always render first/last frame
    st.lastCount = showCount;

    const revealed = new Set(shuffledIndices.slice(0, showCount));
    const data = srcImgData.data;
    const w = canvas.width;
    const getPix = (x, y) => ((y * w) + x) * 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Only fill with black if canvas is supposed to be opaque (relevant for reverse or when effect is partial)
    // If canvas.style.opacity is '0', this fillRect is not seen anyway.
    // If canvas.style.opacity is '1', this provides the base for glyphs.
    if (canvas.style.opacity === '1' || (forward && p > 0) || !forward) {
        ctx.fillStyle = '#000'; // Or whatever background the glyphs appear on
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }


    for (let i = 0; i < total; i++) {
        const { x, y } = grid[i];
        if (!revealed.has(i)) continue;

        const cx = Math.min(w - 1, x + (cellW >> 1));
        const cy = Math.min(canvas.height - 1, y + (cellH >> 1));
        const idx = getPix(cx, cy);
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        ctx.fillRect(x, y, cellW, cellH);
    }
}

export const glyphEffects = {
  /** outline → filled */
  glyphFwd(ctx, canvas, img, progress) { glyphRender(ctx, canvas, img, progress, true); },
  /** filled → outline */
  glyphRev(ctx, canvas, img, progress) { glyphRender(ctx, canvas, img, progress, false); }
};

/* ─── external helper: turn the cover off if it exists ──────────── */
export function hideGlyphCover(canvas) {
    const c = canvas && canvas.__glyphCover;
    if (c) {
      c.style.display = 'none';
      delete c.__framesLeft;
      // Let glyphRender manage canvas opacity
    }
  }

export default glyphEffects;