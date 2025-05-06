// imageRevealCore.js  (synced with playbackMgmt)
import fadeEffects     from './effects/fade.js';
import pixelateEffects from './effects/pixelate.js';
import glyphEffects    from './effects/glyph.js';  


const renders = { ...fadeEffects, ...pixelateEffects, ...glyphEffects };

/* ─── State & DOM refs ────────────────────────────────────────────── */
let ui, effectSel, durSlider, durVal,
    canvas, ctx, img = null,
    dur = 10_000, start = 0, raf = null, running = false;

/* ─── UI ──────────────────────────────────────────────────────────── */
function makeUI () {
  ui = document.createElement('div');
  ui.id = 'imageRevealContainer';
  ui.innerHTML = `
    <style>
      #imageRevealContainer{margin:20px 0;padding:15px;border:1px solid #ddd;background:#f9f9f9}
      #imageCanvas{border:1px solid #000;margin-top:10px;max-width:100%;height:auto;background:#ccc}
    </style>
    <h2 style="margin:0">Image Reveal Effect</h2>
    <div><label>Effect:
      <select id="effectSelector">
        <option value="fadeIn">Fade In (Black → Image)</option>
        <option value="fadeOut">Fade Out (Image → Black)</option>
        <option value="pixelateFwd">Pixelate (Image → Pixels)</option>
        <option value="pixelateRev">De‑Pixelate (Pixels → Image)</option>
        <option value="glyphFwd">Glyph Fill (Outline → Image)</option>
        <option value="glyphRev">Glyph Clear (Image → Outline)</option>

      </select>
    </label></div>
    <div><label>Duration:
      <input type="range" id="durationSlider" min="10" max="300" value="10">
      <span id="durationValueDisplay">10s</span>
    </label></div>
    <canvas id="imageCanvas" width="480" height="270"></canvas>
  `;
  document.body.appendChild(ui);

  effectSel = ui.querySelector('#effectSelector');
  durSlider = ui.querySelector('#durationSlider');
  durVal    = ui.querySelector('#durationValueDisplay');
  canvas    = ui.querySelector('#imageCanvas');
  ctx       = canvas.getContext('2d');

  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.fillText('Image will appear here…', canvas.width / 2, canvas.height / 2);

  effectSel.onchange = () => running && restart();
  durSlider.oninput  = e => {
    dur = +e.target.value * 1000;
    durVal.textContent = `${e.target.value}s`;
    if (running) restart();
  };
}

/* ─── Image hookup ────────────────────────────────────────────────── */
function onImagesReady ({ detail }) {
  img = detail?.images?.find(i => i instanceof HTMLImageElement) || null;
  if (!img) return showMsg('No valid image loaded.');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  resetEffect();          // show first frame
}

/* ─── Effect helpers ──────────────────────────────────────────────── */
function resetEffect () {
  cancelAnimationFrame(raf);
  running = false; raf = null;
  renders[effectSel.value](ctx, canvas, img, 0);
  document.dispatchEvent(new CustomEvent('imageRevealEffectStopped', {
    detail: { effect: effectSel.value }
  }));
}

function startEffect () {
  if (!ctx) return;
  cancelAnimationFrame(raf);
  running = true;
  start = performance.now();
  raf = requestAnimationFrame(loop);
  document.dispatchEvent(new CustomEvent('imageRevealEffectStarted', {
    detail: { effect: effectSel.value, duration: dur }
  }));
}

function restart () {
    resetEffect();
    startEffect();
  }

function loop (t) {
  if (!running) return;
  const p = Math.min((t - start) / dur, 1);
  renders[effectSel.value](ctx, canvas, img, p);
  (p < 1) ? raf = requestAnimationFrame(loop)
          : (running = false, raf = null);
}

/* ─── Canvas click → toggle playback (not the effect directly) ────── */
function onCanvasClick () {
  document.dispatchEvent(new Event('togglePlayback'));
}

/* ─── Listen to playback events to sync the visual effect ─────────── */
document.addEventListener('playbackStarted',  () => startEffect());
document.addEventListener('playbackStopped',  () => resetEffect());

/* ─── Misc helpers ────────────────────────────────────────────────── */
function showMsg (txt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
}

/* ─── Init ────────────────────────────────────────────────────────── */
function init () {
  makeUI();
  document.addEventListener('appImagesReady', onImagesReady);
  if (window.imageRevealLoadedImages)
    onImagesReady({ detail: { images: window.imageRevealLoadedImages } });
  canvas.addEventListener('click', onCanvasClick);
  console.log('ImageRevealCore ready');
}
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
