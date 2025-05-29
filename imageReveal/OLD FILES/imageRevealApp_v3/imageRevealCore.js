// imageRevealCore.js  – condensed version (05 May 2025) - MODIFIED FOR API
import fade     from './effects/fade.js';
import pixel    from './effects/pixelate.js';
import glyph, { hideGlyphCover } from './effects/glyph.js';
import sweep    from './effects/colourSweepBrightness.js';

/* ── Effect registry ─────────────────────────────────────────────── */
export const renders = { ...fade, ...pixel, ...glyph, ...sweep };
const EFFECT_PAIRS = {                 // symmetrical fwd ↔ rev map
  fadeIn:'fadeOut',   fadeOut:'fadeIn',
  pixelateFwd:'pixelateRev', pixelateRev:'pixelateFwd',
  glyphFwd:'glyphRev',       glyphRev:'glyphFwd',
  sweepBrightFwd:'sweepBrightRev', sweepBrightRev:'sweepBrightFwd'
};
const isGlyph = k => k.startsWith('glyph');

/* ── Module‑level state ──────────────────────────────────────────── */
let ui, effectSel, durSlider, durVal,
    canvas, ctx, img = null,
    dur = 10_000, start = 0, raf = null, running = false;

/* ── Duration & direction constants (needed for export) ────────── */
const STEP_FINE = 0.25, STEP_COARSE = 2, DUR_MIN = 0.25, DUR_MAX = 600;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ── UI factory ──────────────────────────────────────────────────── */
function makeUI () {
  const labels = {
    fadeIn:          'Fade In (Black → Image)',
    fadeOut:         'Fade Out (Image → Black)',
    pixelateFwd:     'Pixelate (Image → Pixels)',
    pixelateRev:     'De‑Pixelate (Pixels → Image)',
    glyphFwd:        'Glyph Fill (Outline → Image)',
    glyphRev:        'Glyph Clear (Image → Outline)',
    sweepBrightFwd:  'Brightness Sweep (Dark → Light)',
    sweepBrightRev:  'Brightness Sweep (Light → Dark)'
  };

  ui = document.createElement('div');
  ui.id = 'imageRevealContainer';
  ui.innerHTML = `
    <style>
      #imageRevealContainer{margin:20px 0;padding:15px;border:1px solid #ddd;background:#f9f9f9}
      #imageCanvas{border:1px solid #000;margin-top:10px;max-width:100%;background:#000}
    </style>
    <h2 style="margin:0">Image Reveal Effect</h2>
    <div><label>Effect:<select id="effectSelector"></select></label></div>
    <div><label>Duration:
      <input type="range" id="durationSlider" min="${DUR_MIN}" max="${DUR_MAX}" value="10" step="${STEP_FINE}">
      <span id="durationValueDisplay">10s</span>
    </label></div>
    <canvas id="imageCanvas" width="480" height="270"></canvas>
  `;
  document.body.appendChild(ui);

  /* cache refs */
  [effectSel, durSlider, durVal, canvas] =
    ['#effectSelector', '#durationSlider', '#durationValueDisplay', '#imageCanvas']
      .map(q => ui.querySelector(q));
  ctx = canvas.getContext('2d');

  /* build selector */
  for (const [val, txt] of Object.entries(labels)) {
    const o = document.createElement('option');
    o.value = val; o.textContent = txt;
    effectSel.appendChild(o);
  }

  /* first placeholder frame */
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.fillText('Image will appear here…', canvas.width/2, canvas.height/2);

  /* handlers */
  effectSel.onchange = () => {
    if (!isGlyph(effectSel.value)) hideGlyphCover(canvas);
    running ? restart() : resetEffect();
  };
  durSlider.oninput = ({target:{value}}) => {
    dur = Number(value) * 1000; // Ensure value is number
    durVal.textContent = `${value}s`;
    if (running) restart();
  };
}

/* ── Image hookup & API Function ─────────────────────────────────── */
// Exported function to directly set the image from API or other modules
export function setImage(newImgElement) {
  img = newImgElement instanceof HTMLImageElement ? newImgElement : null;
  if (!canvas || !ctx) { // Check if canvas and context are available
      console.warn("ImageRevealCore: setImage called before canvas/ctx is ready. Attempting to get them.");
      const c = document.getElementById('imageCanvas');
      if (c) {
          canvas = c; // Make sure canvas is assigned if found
          ctx = canvas.getContext('2d');
      } else {
          console.error("ImageRevealCore: setImage - canvas not found in DOM.");
          // If makeUI hasn't run, these won't exist.
          // The API consumer should ensure core is initialized before calling.
          return;
      }
  }

  if (!img) {
    showMsg('No valid image provided or loaded.');
    // Optionally, reset canvas to default placeholder size/content
    // if (canvas) {
    //    canvas.width = 480; canvas.height = 270; // Default from makeUI
    //    if (ctx) {
    //      ctx.fillStyle = '#555';
    //      ctx.textAlign = 'center';
    //      ctx.fillText('Image will appear here…', canvas.width/2, canvas.height/2);
    //    }
    // }
    return;
  }
  [canvas.width, canvas.height] = [img.naturalWidth, img.naturalHeight];
  resetEffect(); // This will render the first frame of the current effect with the new image
}

// Original onImagesReady now uses the new setImage function
function onImagesReady ({ detail }) {
  const newImgForEffect = detail?.images?.find(i => i instanceof HTMLImageElement) || null;
  setImage(newImgForEffect); // Call the exportable setImage
}


/* ── Core helpers ────────────────────────────────────────────────── */
const renderFrame = p => renders[effectSel.value](ctx, canvas, img, p);

function resetEffect () {
  if (!canvas || !ctx) return; // Guard against calls before UI is ready
  cancelAnimationFrame(raf); running = false; raf = null;
  if (!isGlyph(effectSel.value)) hideGlyphCover(canvas);
  renderFrame(0);
  dispatch('imageRevealEffectStopped');
}
function startEffect () {
  if (!ctx || !img) return;
  cancelAnimationFrame(raf); running = true;
  if (!isGlyph(effectSel.value)) hideGlyphCover(canvas);
  renderFrame(0);
  start = performance.now();
  raf   = requestAnimationFrame(loop);
  dispatch('imageRevealEffectStarted', { duration: dur });
}
const restart = () => { resetEffect(); startEffect(); };

function loop (t) {
  if (!running) return;
  const p = Math.min((t - start) / dur, 1);
  renderFrame(p);
  p < 1 ? raf = requestAnimationFrame(loop)
        : (running = false, raf = null, dispatch('imageRevealEffectCompleted')); // Added completed event
}

const dispatch = (type, extra = {}) =>
  document.dispatchEvent(new CustomEvent(type, { detail: { effect: effectSel.value, ...extra } }));

/* ── Duration & direction utilities / API Functions ───────────────── */
// Constants DUR_MIN, DUR_MAX, clamp defined earlier

function adjustDuration ({ delta = 0, factor = 1 } = {}) {
  if (!durSlider) return; // Guard if UI not ready
  const next = delta ? +durSlider.value + delta
                     : +durSlider.value * factor;
  const secs = +clamp(next, DUR_MIN, DUR_MAX).toFixed(2);
  if (secs === +durSlider.value) return;
  durSlider.value = String(secs); // Use String for input value
  durVal.textContent = `${String(secs).replace(/\.?0+$/,'')}s`;
  durSlider.dispatchEvent(new Event('input', { bubbles: true }));
}

function setDirection (wantReverse = false) {
  if(!effectSel) return; // Guard
  const curr = effectSel.value, opposite = EFFECT_PAIRS[curr];
  if (!opposite) return;

  const isCurrReverse = curr === opposite; // This logic seems problematic. curr is never === opposite if they are different strings
                                           // Let's re-evaluate: isCurrReverse means "is the current effect a 'Rev' effect?"
                                           // A better check: does curr.endsWith('Rev') or is curr the reverse pair of some Fwd?
                                           // For simplicity, let's assume EFFECT_PAIRS defines the directionality.
                                           // The crucial check is: if wantReverse, is effectSel.value already the 'Rev' version?
                                           // If !wantReverse, is effectSel.value already the 'Fwd' version?

  let isAlreadyCorrectDirection = false;
  // Check if current effect is the one we want (forward or reverse)
  if (wantReverse) { // We want a reverse effect
    // Is the current effect already the designated reverse effect for its pair?
    // This requires finding which pair 'curr' belongs to.
    const fwdBase = Object.keys(EFFECT_PAIRS).find(fwd => EFFECT_PAIRS[fwd] === curr);
    if (fwdBase) { // current is a Rev effect
        isAlreadyCorrectDirection = true;
    } else if (EFFECT_PAIRS[curr] === curr) { // Symmetrical case, could be pixelateRev -> pixelateFwd but we want Rev
        // This condition EFFECT_PAIRS[curr] === curr is never true with the given EFFECT_PAIRS
        // The original logic "isCurrReverse = curr === opposite;" actually means
        // "is the current effect its own opposite according to the map?" which is always false.
        // Let's simplify: if we want reverse, and current is not opposite, or is opposite but is a fwd, change.
    }
  } else { // We want a forward effect
    // Is the current effect already the designated forward effect for its pair?
    if (EFFECT_PAIRS[curr] && EFFECT_PAIRS[EFFECT_PAIRS[curr]] === curr) { // curr is a Fwd effect
        isAlreadyCorrectDirection = true;
    }
  }
  // The original logic for this was simpler:
  // const isCurrReverse = curr === opposite; // This is always false.
  // The original line: `if (wantReverse === isCurrReverse)`
  // If wantReverse is true, this becomes `if(true === (curr === opposite))` -> `if(true === false)` -> `if(false)`
  // If wantReverse is false, this becomes `if(false === (curr === opposite))` -> `if(false === false)` -> `if(true)`
  // This means the original logic *always* thought it was in the "forward" direction state initially if wantReverse was false.
  // Let's use a more direct check based on what 'opposite' means.

  const currentlyIsReverseEffect = Object.values(EFFECT_PAIRS).includes(curr) && !Object.keys(EFFECT_PAIRS).some(key => EFFECT_PAIRS[key] === curr && key === curr);
    // A simpler way to check if current is a "reverse" variant:
    // It's a "Rev" if it's a value in EFFECT_PAIRS, and its key (the Fwd) is different.
    // Example: if curr = 'fadeOut', its key is 'fadeIn'. 'fadeOut' is a reverse.
    // if curr = 'pixelateRev', its key is 'pixelateFwd'. 'pixelateRev' is a reverse.
    let isCurrentEffectReversed = false;
    for (const fwdKey in EFFECT_PAIRS) {
        if (EFFECT_PAIRS[fwdKey] === curr && fwdKey !== curr) {
            isCurrentEffectReversed = true;
            break;
        }
    }


  if (wantReverse === isCurrentEffectReversed) { // Already in the desired direction
    if (running) return; // If already running, don't just restart, let it play
    // If not running, and direction is already correct, just start it
    start = performance.now(); running = true; raf = requestAnimationFrame(loop);
    return;
  }

  // If we need to switch direction:
  const p = running ? Math.min((performance.now() - start) / dur, 1) : 0; // If not running, progress is 0
  const nextP = 1 - p;
  effectSel.value = opposite; // Switch to the opposite effect
  start = performance.now() - nextP * dur;        // shift timeline
  renderFrame(nextP); // Render the frame at the new progress
  if (!running) { // If it wasn't running, start it
      running = true; raf = requestAnimationFrame(loop);
  }
  // If it was running, it will continue with the new effect and adjusted timeline
  // No need to explicitly call requestAnimationFrame(loop) if already running,
  // but ensuring `running` is true and `raf` is set is good.
  // If it was running, `raf` would not be null.
  // Let's ensure it always starts/continues the loop if it's meant to be active.
  if (raf === null) { // If it was stopped or just switched direction while stopped.
    raf = requestAnimationFrame(loop);
  }
}

// API function to set effect
export function setEffectParameter(effectName) {
  if (!effectSel) { console.error("ImageRevealCore: setEffectParameter - effectSelector not found."); return; }
  const isValidEffect = Array.from(effectSel.options).some(opt => opt.value === effectName);
  if (!isValidEffect) {
      console.warn(`ImageRevealCore: Effect "${effectName}" is not a valid option. No change made. Available: ${Array.from(effectSel.options).map(o=>o.value).join(', ')}`);
      return;
  }
  if (effectSel.value !== effectName) {
    effectSel.value = effectName;
    if (effectSel.onchange) effectSel.onchange(); // Trigger existing logic (restarts or resets effect)
  }
}

// API function to set duration
export function setDurationParameter(seconds) {
  if (!durSlider || !durVal) { console.error("ImageRevealCore: setDurationParameter - UI elements not found."); return; }
  const newSliderValue = +clamp(Number(seconds), DUR_MIN, DUR_MAX).toFixed(2); // Ensure seconds is number
  if (parseFloat(durSlider.value) !== newSliderValue) {
    durSlider.value = String(newSliderValue);
    // The oninput handler will update `dur` and `durVal.textContent` and restart if running
    if (durSlider.oninput) durSlider.oninput({ target: { value: String(newSliderValue) } });
  }
}


/* ── Keyboard & canvas handlers ───────────────────────────────────── */
function onKey (e) {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  const { key, ctrlKey, shiftKey } = e;

  if (key === 'ArrowUp' || key === 'ArrowDown') {
    e.preventDefault(); // Prevent page scroll
    const sign = key === 'ArrowUp' ? 1 : -1;
    ctrlKey ? adjustDuration({ factor : key === 'ArrowUp' ? 2 : 0.5 })
            : adjustDuration({ delta  : sign * (shiftKey ? STEP_COARSE : STEP_FINE) });
    return;
  }

  if (ctrlKey && key === '0') {                   // Ctrl+0 → reset to 10 s
    e.preventDefault();
    // Calculate delta to reach 10s from current value
    if (durSlider) adjustDuration({ delta: 10 - parseFloat(durSlider.value) });
    return;
  }
  if (key === 'ArrowLeft')  { e.preventDefault(); setDirection(true);  return; }
  if (key === 'ArrowRight') { e.preventDefault(); setDirection(false); return; }
}

const onCanvasClick = () => document.dispatchEvent(new Event('togglePlayback'));

/* ── Misc ─────────────────────────────────────────────────────────── */
function showMsg (txt) {
  if (!ctx || !canvas) return; // Guard
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#555'; ctx.textAlign = 'center';
  ctx.fillText(txt, canvas.width/2, canvas.height/2);
}

/* ── Bootstrapping ────────────────────────────────────────────────── */
function init () {
  makeUI();
  document.addEventListener('appImagesReady', onImagesReady);
  if (window.imageRevealLoadedImages) { // If images loaded before this script
    // Make sure onImagesReady can handle this (it now calls setImage which checks for canvas)
    onImagesReady({ detail: { images: window.imageRevealLoadedImages } });
  }

  // Ensure canvas is available before adding event listener
  if (canvas) {
      canvas.addEventListener('click', onCanvasClick);
  } else {
      console.warn("ImageRevealCore: Canvas not found during init to add click listener.");
  }
  window.addEventListener('keydown', onKey, { passive: false }); // passive:false for preventDefault
  document.addEventListener('playbackStarted', startEffect);
  document.addEventListener('playbackStopped', resetEffect);

  console.log('ImageRevealCore ready (condensed, API-enabled)');
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

// === Exports for Public API ===
export {
  // Core control functions
  startEffect,
  resetEffect,
  restart as restartEffect, // Export existing 'restart' const, aliased as 'restartEffect'
  setDirection,
  // setImage, setEffectParameter, setDurationParameter are already exported with `export function ...`

  // Constants and effect info
  EFFECT_PAIRS,
  DUR_MIN,
  DUR_MAX,
  // 'renders' is already exported at the top
};