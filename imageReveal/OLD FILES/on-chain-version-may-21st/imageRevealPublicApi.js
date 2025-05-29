
// imageRevealPublicApi.js
// Public wrapper around imageRevealCore.js

import {
    startEffect, resetEffect, restartEffect, setDirection,
    setEffectParameter, setDurationParameter,
    setImage as coreSetImage,
    DUR_MIN, DUR_MAX, renders as coreRenders
  } from '/content/7b66beb111fbc673a99867f13480a3289afc522b811ddd60163b3bcbb82aa758i0';
  
  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  
  const IDS = ['imageRevealContainer', 'effectSelector', 'durationSlider', 'imageCanvas'];
  const $    = id => document.getElementById(id);
  const _ok  = () => {
    for (const id of IDS) if (!$(id)) return _err(`#${id} not found`);
    if (!$('imageCanvas').getContext?.('2d')) return _err('2D context missing');
    if (typeof startEffect !== 'function' || typeof coreSetImage !== 'function')
      return _err('Core functions not imported');
    return true;
  };
  const _err = msg => (console.error(`ImageReveal API: ${msg}`), false);
  
  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  
  /** Load an image URL and hand it to the core. */
  export async function loadImage(url) {
    if (!_ok()) throw new Error('Core UI not ready');
    if (typeof url !== 'string' || !url.trim()) {
      coreSetImage(null);
      throw new Error('Invalid image URL');
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { coreSetImage(img); resolve(img); };
      img.onerror = () => { coreSetImage(null); reject(new Error(`Failed to load ${url}`)); };
      img.src = url;
    });
  }
  
  /** Convenience: load image, choose effect, set duration. */
  export async function setupEffect(url, effect, seconds) {
    await loadImage(url);
    selectEffect(effect);
    setEffectDuration(seconds);
  }
  
  /** Choose visual effect. */
  export function selectEffect(name) {
    if (_ok() && typeof name === 'string') setEffectParameter(name);
  }
  
  /** Set effect duration (seconds). */
  export function setEffectDuration(s) {
    if (_ok()) {
      const n = parseFloat(s);
      if (!isNaN(n)) setDurationParameter(n);
    }
  }
  
  /* playback controls */
  export const start    = () => _ok() && startEffect();
  export const stop     = () => _ok() && resetEffect();
  export const restart  = () => _ok() && restartEffect();
  export const setPlaybackDirection = rev => _ok() && typeof rev === 'boolean' && setDirection(rev);
  
  /** List available effects. */
  export function getAvailableEffects() {
    if (!_ok()) return Object.keys(coreRenders || {}).map(k => ({ value:k, text:k }));
    const sel = $('effectSelector');
    return Array.from(sel.options).map(o => ({ value:o.value, text:o.textContent }));
  }
  
  /** Current UI settings (effect, duration, ranges). */
  export function getCurrentSettings() {
    if (!_ok()) return { error:'Core UI not ready', effect:null, duration:null, minDuration:DUR_MIN||.25, maxDuration:DUR_MAX||600 };
    return {
      effect      : $('effectSelector')?.value ?? null,
      duration    : parseFloat($('durationSlider')?.value) || null,
      minDuration : DUR_MIN,
      maxDuration : DUR_MAX
    };
  }
  
  console.log('ImageRevealPublicApi.js loaded.');
  