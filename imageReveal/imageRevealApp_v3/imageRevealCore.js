// imageRevealCore.js  (synced with playbackMgmt)
import fadeEffects     from './effects/fade.js';
import pixelateEffects from './effects/pixelate.js';
import glyphEffects    from './effects/glyph.js';  
import sweepBrightEffects from './effects/colourSweepBrightness.js';


const renders = { ...fadeEffects, ...pixelateEffects, ...glyphEffects, ...sweepBrightEffects };

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
      #imageCanvas{border:1px solid #000;margin-top:10px;max-width:100%;height:auto;background:black} 
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
        <option value="sweepBrightFwd">Brightness Sweep (Dark → Light)</option>
        <option value="sweepBrightRev">Brightness Sweep (Light → Dark)</option>

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

  effectSel.onchange = () => running ? restart() : resetEffect();
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
    if (!ctx || !img) return;
  
    // 1. Stop anything that might still be running
    cancelAnimationFrame(raf);
    running = true;
  
    /* 2. *Immediately* draw the very first frame (progress = 0)
          so nothing old can be seen even for a single repaint       */
    renders[effectSel.value](ctx, canvas, img, 0);
  
    // 3. Now begin the timeline → the next RAF will draw progress > 0
    start = performance.now();
    raf   = requestAnimationFrame(loop);
  
    document.dispatchEvent(
      new CustomEvent('imageRevealEffectStarted', {
        detail: { effect: effectSel.value, duration: dur }
      })
    );
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

/* ─── Add just below the existing `renders` object ────────────────── */
const EFFECT_PAIRS = {               // quick forward↔reverse lookup
    fadeIn:            'fadeOut',
    fadeOut:           'fadeIn',
    pixelateFwd:       'pixelateRev',
    pixelateRev:       'pixelateFwd',
    glyphFwd:          'glyphRev',
    glyphRev:          'glyphFwd',
    sweepBrightFwd:    'sweepBrightRev',
    sweepBrightRev:    'sweepBrightFwd'
  };

    const STEP_FINE    = 0.25;   // 250 ms
    const STEP_COARSE  = 2;      //   2 s
    const DUR_MIN      = 0.25;   // clamp so we never reach 0
    const DUR_MAX      = 600;    // 10 min hard upper limit

  
  /* ─── Helper: change duration by delta secs OR multiply by factor ─── */
function adjustDuration ({ delta = 0, factor = 1 } = {}) {
    /* 1. work in seconds for human readability */
    const currSecs   = +durSlider.value;
    const nextSecs   = (delta !== 0)
                       ? currSecs + delta
                       : currSecs * factor;
  
    /* 2. clamp + round to 2 dp so the slider & label stay tidy */
    const clamped    = Math.min(Math.max(nextSecs, DUR_MIN), DUR_MAX)
                          .toFixed(2);
  
    /* 3. short‑circuit if unchanged */
    if (+clamped === currSecs) return;
  
    /* 4. push back into the UI → this fires the existing `input` handler */
    durSlider.value      = clamped;
    durVal.textContent   = `${clamped.replace(/\.?0+$/, '')}s`;
    durSlider.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
/* ─── Helper: change direction *without* jumping; restart if at ends ─── */
function setDirection (wantReverse = false) {
    const curr = effectSel.value;
    const pair = Object.entries(EFFECT_PAIRS)
                       .find(([fwd, rev]) => fwd === curr || rev === curr);
    if (!pair) return;                          // unknown renderer, bail‑out
  
    const [fwd, rev] = pair;
    const isCurrRev  = curr === rev;
  
    /* 1️⃣  If the request matches the current direction … */
    if (wantReverse === isCurrRev) {
      /* …and we’re already running, nothing to do. */
      if (running) return;
  
      /* …but the animation has finished (running === false) → simply replay. */
      start   = performance.now();              // reset timeline
      running = true;
      raf     = requestAnimationFrame(loop);
      return;
    }
  
    /* 2️⃣  We are flipping direction mid‑stream (or at an end) */
    const elapsed = performance.now() - start;  // ms into the current run
    const p       = Math.min(elapsed / dur, 1); // clamp to 1 in case it’s over
  
    const nextRenderer = wantReverse ? rev : fwd;
    const nextP        = 1 - p;                 // mirror progress for new renderer
  
    /* shift timeline so (t − start)/dur === nextP on the very next frame */
    start = performance.now() - nextP * dur;
    effectSel.value = nextRenderer;
  
    /* draw the identical frame *immediately* to avoid flicker */
    renders[nextRenderer](ctx, canvas, img, nextP);
  
    /* make sure the main loop is running */
    if (!running) {
      running = true;
      raf     = requestAnimationFrame(loop);
    }
  }
  
  
  /* ─── Global key‑handler ──────────────────────────────────────────── */
  function onKey (e) {
    if (['INPUT','TEXTAREA','SELECT'].includes(
          (document.activeElement?.tagName || '').toUpperCase())) return;
  
    /* ── speed control ─────────────────────────────────────────────── */
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const sign   = e.key === 'ArrowUp' ? +1 : -1;
      if (e.ctrlKey)                // Ctrl   → scale duration
        adjustDuration({ factor : e.key === 'ArrowUp' ? 2 : 0.5 });
      else if (e.shiftKey)          // Shift  → coarse step
        adjustDuration({ delta  : sign * STEP_COARSE });
      else                          // no mod → fine step
        adjustDuration({ delta  : sign * STEP_FINE });
      e.preventDefault();           // stop page scroll
      return;
    }
    if (e.ctrlKey && e.key === '0') {          // Ctrl+0 → reset
      adjustDuration({ delta : (10 - +durSlider.value) });
      e.preventDefault();
      return;
    }
  
    /* ── direction control (unchanged) ─────────────────────────────── */
    if (e.key === 'ArrowLeft')  { setDirection(true);  e.preventDefault(); return; }
    if (e.key === 'ArrowRight') { setDirection(false); e.preventDefault(); return; }
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
    window.addEventListener('keydown', onKey, { passive: false });
  
    console.log('ImageRevealCore ready');
  }


document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
