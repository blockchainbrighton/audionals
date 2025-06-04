
// src/effects/index.js

/**
 * Effects Module Exports
 * Central export point for all effects-related modules
 */

export { EffectManager, default as DefaultEffectManager } from './EffectManager.js';
export { EffectImplementations, default as DefaultEffectImplementations } from './EffectImplementations.js';
export { BaseEffect, default as DefaultBaseEffect } from './base/BaseEffect.js';

import EffectManager from './EffectManager.js';
import EffectImplementations from './EffectImplementations.js';
import BaseEffect from './base/BaseEffect.js';



import { 
  EffectDefaults, 
  cloneDefaults, 
  getEffectNames, 
  getEffectParameters 
} from './base/EffectConfig.js';


// Re-export specific implementations for direct access
export {
  applyFade,
  applyScanLines,
  applyFilmGrain,
  applyBlur,
  applyVignette,
  applyGlitch,
  applyChromaShift,
  applyColourSweep,
  applyPixelate
} from './EffectImplementations.js';

// Legacy compatibility exports
export const effectDefaults = EffectDefaults;
export const effectKeys = getEffectNames();
export const effectParams = Object.fromEntries(
  getEffectNames().map(name => [name, getEffectParameters(name)])
);

// Effect order management functions
export function moveEffectToTop(effects, enabledOrder, effectName) {
  const maxOrder = Math.max(0, ...enabledOrder.map(e => effects[e]?.order ?? 0));
  effects[effectName] ??= cloneDefaults(effectName);
  effects[effectName].order = maxOrder + 1;
  if (!enabledOrder.includes(effectName)) {
    enabledOrder.push(effectName);
  }
}

export function resetEffectOrder(effects, enabledOrder, effectName = null) {
  if (effectName) {
    if (effects[effectName]) {
      effects[effectName].order = null;
    }
  } else {
    enabledOrder.forEach(name => {
      if (effects[name]) {
        effects[name].order = null;
      }
    });
  }
}

export function sortEnabledOrder(effects, enabledOrder) {
  const defaultOrder = [
    "fade", "pixelate", "scanLines", "vignette", "blur", 
    "chromaShift", "colourSweep", "filmGrain", "glitch"
  ];
  
  enabledOrder.sort((a, b) => {
    const orderA = effects[a]?.order ?? defaultOrder.indexOf(a);
    const orderB = effects[b]?.order ?? defaultOrder.indexOf(b);
    return orderA - orderB;
  });
}

// Combined utilities object
export const Effects = {
  Manager: EffectManager,
  Implementations: EffectImplementations,
  BaseEffect,
  defaults: EffectDefaults,
  cloneDefaults,
  getEffectNames,
  getEffectParameters,
  moveEffectToTop,
  resetEffectOrder,
  sortEnabledOrder
};

export default Effects;

