/**
 * Fade Effect
 * Simple fade in/out effect
 */

import { BaseEffect } from '../base/BaseEffect.js';
import { EffectDefaults } from '../base/EffectConfig.js';
import { MathUtils } from '../../utils/index.js';

export class FadeEffect extends BaseEffect {
  constructor() {
    super('fade', EffectDefaults.fade);
    this.category = 'visual';
    this.description = 'Fade in/out effect with customizable speed and direction';
  }

  /**
   * Render the fade effect
   * @param {CanvasRenderingContext2D} srcCtx - Source context
   * @param {CanvasRenderingContext2D} dstCtx - Destination context
   * @param {number} currentTime - Current time in seconds
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  onRender(srcCtx, dstCtx, currentTime, width, height) {
    // Clear destination
    dstCtx.clearRect(0, 0, width, height);
    
    // Fill with black background
    dstCtx.fillStyle = '#000';
    dstCtx.fillRect(0, 0, width, height);
    
    // Apply fade by setting global alpha
    const alpha = MathUtils.clamp(this.parameters.progress, 0, 1);
    dstCtx.globalAlpha = alpha;
    
    // Draw source image with fade
    dstCtx.drawImage(srcCtx.canvas, 0, 0);
    
    // Reset global alpha
    dstCtx.globalAlpha = 1;
  }

  /**
   * Get parameter metadata for UI generation
   * @returns {Object} Parameter metadata
   */
  getParameterMetadata() {
    return {
      progress: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Progress',
        description: 'Fade progress (0 = fully faded, 1 = fully visible)'
      },
      direction: {
        type: 'select',
        options: [
          { value: 1, label: 'Fade In' },
          { value: -1, label: 'Fade Out' }
        ],
        label: 'Direction',
        description: 'Fade direction'
      },
      speed: {
        type: 'range',
        min: 0.1,
        max: 5,
        step: 0.1,
        label: 'Speed',
        description: 'Animation speed multiplier'
      },
      paused: {
        type: 'checkbox',
        label: 'Paused',
        description: 'Pause the animation'
      }
    };
  }
}

export default FadeEffect;

