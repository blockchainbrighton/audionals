// src/effects/EffectManager.js

/**
 * Effect Manager
 * Manages effect lifecycle, ordering, and rendering pipeline
 */

import { EffectDefaults, cloneDefaults, getEffectNames } from './base/EffectConfig.js';
import { MathUtils } from '../utils/index.js';

export class EffectManager {
  constructor() {
    this.effects = {};
    this.enabledOrder = [];
    this.effectMap = {};
    this.defaultOrder = [
      "fade", "pixelate", "scanLines", "vignette", "blur", 
      "chromaShift", "colourSweep", "filmGrain", "glitch"
    ];
    
    this.initializeEffects();
  }

  /**
   * Initialize all effects with default parameters
   */
  initializeEffects() {
    const effectNames = getEffectNames();
    effectNames.forEach(name => {
      this.effects[name] = cloneDefaults(name);
    });
  }

  /**
   * Register an effect rendering function
   * @param {string} name - Effect name
   * @param {Function} renderFunction - Effect render function
   */
  registerEffect(name, renderFunction) {
    this.effectMap[name] = renderFunction;
  }

  /**
   * Enable an effect
   * @param {string} name - Effect name
   */
  enableEffect(name) {
    if (!this.effects[name]) {
      console.warn(`[EffectManager] Unknown effect: ${name}`);
      return;
    }

    this.effects[name] = cloneDefaults(name);
    this.effects[name].active = true;

    if (!this.enabledOrder.includes(name)) {
      this.enabledOrder.push(name);
      this.sortEnabledOrder();
    }
  }

  /**
   * Disable an effect
   * @param {string} name - Effect name
   */
  disableEffect(name) {
    if (this.effects[name]) {
      this.effects[name].active = false;
    }

    const index = this.enabledOrder.indexOf(name);
    if (index !== -1) {
      this.enabledOrder.splice(index, 1);
    }
  }

  /**
   * Move effect to top of rendering order
   * @param {string} name - Effect name
   */
  moveEffectToTop(name) {
    if (!this.effects[name]) {
      this.effects[name] = cloneDefaults(name);
    }

    const maxOrder = Math.max(0, ...this.enabledOrder.map(e => 
      this.effects[e]?.order ?? this.defaultOrder.indexOf(e)
    ));
    
    this.effects[name].order = maxOrder + 1;
    
    if (!this.enabledOrder.includes(name)) {
      this.enabledOrder.push(name);
    }
    
    this.sortEnabledOrder();
  }

  /**
   * Sort enabled effects by their order
   */
  sortEnabledOrder() {
    this.enabledOrder.sort((a, b) => {
      const orderA = this.effects[a]?.order ?? this.defaultOrder.indexOf(a);
      const orderB = this.effects[b]?.order ?? this.defaultOrder.indexOf(b);
      return orderA - orderB;
    });
  }

  /**
   * Set effect parameter
   * @param {string} effectName - Effect name
   * @param {string} paramName - Parameter name
   * @param {*} value - Parameter value
   */
  setEffectParameter(effectName, paramName, value) {
    if (!this.effects[effectName]) {
      this.effects[effectName] = cloneDefaults(effectName);
    }

    if (paramName === 'moveToTop' && value) {
      this.moveEffectToTop(effectName);
      return;
    }

    this.effects[effectName][paramName] = value;
  }

  /**
   * Get effect parameter
   * @param {string} effectName - Effect name
   * @param {string} paramName - Parameter name
   * @returns {*} Parameter value
   */
  getEffectParameter(effectName, paramName) {
    return this.effects[effectName]?.[paramName];
  }

  /**
   * Update all effects (for animation)
   * @param {number} currentTime - Current time in seconds
   * @param {Object} elapsed - Elapsed time information
   */
  updateEffects(currentTime, elapsed) {
    for (const effectName of this.enabledOrder) {
      const effect = this.effects[effectName];
      if (effect?.active) {
        this.updateEffect(effectName, effect, currentTime, elapsed);
      }
    }
  }

  /**
   * Update individual effect
   * @param {string} name - Effect name
   * @param {Object} effect - Effect parameters
   * @param {number} currentTime - Current time
   * @param {Object} elapsed - Elapsed time information
   */
  updateEffect(name, effect, currentTime, elapsed) {
    // Handle pixelate rhythmic updates
    if (name === 'pixelate') {
      this.updatePixelateRhythmic(effect, elapsed);
    }

    // Update progress for effects that use it
    if (effect.hasOwnProperty('progress') && 
        effect.hasOwnProperty('direction') && 
        effect.hasOwnProperty('speed') &&
        !effect.paused) {
      
      const deltaTime = currentTime - (effect.lastUpdateTime || currentTime);
      effect.lastUpdateTime = currentTime;
      
      effect.progress += effect.direction * effect.speed * deltaTime;
      effect.progress = MathUtils.clamp(effect.progress, 0, 1);
    }
  }

  /**
   * Update pixelate effect with rhythmic synchronization
   * @param {Object} effect - Pixelate effect parameters
   * @param {Object} elapsed - Elapsed time information
   */
  updatePixelateRhythmic(effect, elapsed) {
    if (!effect.active || effect.syncMode === 'none' || !effect.pixelStages?.length) {
      return;
    }

    const tickRates = { 
      beat: 1, 
      bar: 1 / 4, // Assuming 4/4 time signature
      '1/2': 2, 
      '1/4': 4, 
      '1/8': 8, 
      '1/16': 16 
    };
    
    const tickRate = tickRates[effect.syncMode];
    if (!tickRate) return;

    const currentTick = effect.syncMode === 'bar' ? 
      Math.floor(elapsed.bar) : 
      Math.floor(elapsed.beat * tickRate);

    if (effect._lastTick === undefined || effect._lastTick === -1) {
      effect._lastTick = currentTick;
      return;
    }

    if (currentTick <= effect._lastTick) return;

    effect._lastTick = currentTick;

    if (effect.behavior === 'sequence' || effect.behavior === 'increase') {
      effect._currentStageIndex = (effect._currentStageIndex + 1) % effect.pixelStages.length;
      effect.pixelSize = effect.pixelStages[effect._currentStageIndex];
    } else if (effect.behavior === 'random') {
      const idx = MathUtils.randomInt(0, effect.pixelStages.length - 1);
      effect.pixelSize = effect.pixelStages[idx];
      effect._currentStageIndex = idx;
    }
  }

  /**
   * Render all enabled effects
   * @param {CanvasRenderingContext2D} initialCtx - Initial source context
   * @param {CanvasRenderingContext2D} bufferCtxA - Buffer context A
   * @param {CanvasRenderingContext2D} bufferCtxB - Buffer context B
   * @param {number} currentTime - Current time
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @returns {CanvasRenderingContext2D} Final rendered context
   */
  renderEffects(initialCtx, bufferCtxA, bufferCtxB, currentTime, width, height) {
    let readCtx = initialCtx;
    let writeCtx = bufferCtxA;

    for (const effectName of this.enabledOrder) {
      const effect = this.effects[effectName];
      if (effect?.active && this.effectMap[effectName]) {
        this.effectMap[effectName](readCtx, writeCtx, currentTime, effect, width, height);
        [readCtx, writeCtx] = [writeCtx, readCtx];
      }
    }

    return readCtx;
  }

  /**
   * Clear all effects
   */
  clearAllEffects() {
    this.enabledOrder.length = 0;
    this.initializeEffects();
  }

  /**
   * Get enabled effects
   * @returns {Array<string>} Array of enabled effect names
   */
  getEnabledEffects() {
    return [...this.enabledOrder];
  }

  /**
   * Get all available effects
   * @returns {Array<string>} Array of all effect names
   */
  getAllEffects() {
    return getEffectNames();
  }

  /**
   * Get effect state
   * @param {string} name - Effect name
   * @returns {Object} Effect state
   */
  getEffectState(name) {
    return this.effects[name] ? { ...this.effects[name] } : null;
  }

  /**
   * Serialize all effects state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      effects: { ...this.effects },
      enabledOrder: [...this.enabledOrder]
    };
  }

  /**
   * Deserialize effects state
   * @param {Object} state - Serialized state
   */
  deserialize(state) {
    this.effects = { ...state.effects };
    this.enabledOrder = [...state.enabledOrder];
  }
}

export default EffectManager;

