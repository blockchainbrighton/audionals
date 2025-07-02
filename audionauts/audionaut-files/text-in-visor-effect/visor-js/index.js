// visor-js/index.js
import { ANIMATION_CONFIG, SEED, BASE_CFG } from './config.js';
import SEED_CONFIGS from './seedConfigs.js';
import { updateGeometry } from './geometry.js';
import { grain } from './grain.js';
import { HEARTBEAT_SETTINGS, beep } from './heartbeat.js';
import { setupAnimationState } from './setupState.js';
import { loop } from './loop.js';
import { PLAYBACK_STATE } from './state.js';

const chosenSeed = SEED_CONFIGS[SEED % SEED_CONFIGS.length] || {},
  CFG = { ...BASE_CFG, ...chosenSeed },
  cvs = document.getElementById("hud-canvas"),
  ctx = cvs.getContext("2d", { alpha: !0 }),
  noise = document.createElement("canvas"),
  nCtx = noise.getContext("2d", { willReadFrequently: !0 }),
  helmet = document.getElementById("helmet-overlay"),
  chars = [...CFG.text],
  geom = { helmet: {}, visor: {} },
  animationState = {},
  lastHeartbeatTimeRef = { value: 0 },
  lastTimeRef = { value: performance.now() },
  pxOffsetRef = { value: 0 },
  charShiftRef = { value: 0 };

function resize() {
  const parent = cvs.parentElement;
  if (!parent) return;
  const { scale, size } = updateGeometry(helmet, CFG.visorRel, geom, parent, noise);
  cvs.width = cvs.height = size * scale;
  cvs.style.width = cvs.style.height = `${size}px`;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
window.addEventListener("resize", resize);

function clearVisor() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);
}

function boot() {
  resize();
  setupAnimationState(false, animationState, helmet, cvs);

  setTimeout(() => {
    const wrap = (fn, on) => (...a) => { setupAnimationState(on, animationState, helmet, cvs); fn?.apply(this, a); };
    window.animateTitleOnPlay = wrap(window.animateTitleOnPlay, 1);
    window.resetTitleText = wrap(window.resetTitleText, 0);
    setupAnimationState(0, animationState, helmet, cvs);
  }, 0);

  // Heartbeat state management & animation control
  window.addEventListener('fxPlaybackStart', () => {
    lastHeartbeatTimeRef.value = window.fxAudioContext ? window.fxAudioContext.currentTime : 0;
    PLAYBACK_STATE.running = true;
  });
  window.addEventListener('fxPlaybackStop', () => {
    lastHeartbeatTimeRef.value = 0;
    PLAYBACK_STATE.running = false;
    clearVisor();
  });

  // AudioContext setup
  let audioContext;
  (document.getElementById('canvas-container') || {}).addEventListener?.('click', () => {
    if (!audioContext) try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); console.log("AudioContext initialized."); } catch (e) { console.error("Web Audio API is not supported.", e); }
    audioContext?.state === 'suspended' && audioContext.resume();
  }, { once: !0 });

  // Start animation loop when helmet image is loaded
  const startAnim = () => requestAnimationFrame(
    loop(
      ctx, cvs, geom, CFG, chars, helmet, noise, nCtx, animationState, lastHeartbeatTimeRef, lastTimeRef, pxOffsetRef, charShiftRef
    )
  );
  helmet.complete ? startAnim() : (
    helmet.addEventListener("load", startAnim),
    helmet.addEventListener("error", () => console.error("HUD failed: Helmet image couldn't load."))
  );
}
boot();
