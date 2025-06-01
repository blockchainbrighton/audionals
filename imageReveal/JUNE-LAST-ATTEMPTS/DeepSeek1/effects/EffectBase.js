//effects/EffectBase.js

export class EffectBase {
    constructor() {
      this.name = 'BaseEffect';
      this.params = {};
    }
    
    apply(sourceCanvas, targetCanvas, beatInfo, prng) {
      throw new Error('apply() must be implemented by subclass');
    }
  }
  
  export class EffectManager {
    constructor() {
      this.effects = [];
      this.intensity = 0.5;
    }
    
    registerEffect(effectClass) {
      this.effects.push(new effectClass());
    }
    
    applyEffects(sourceCanvas, targetCanvas, beatInfo, prng) {
      const ctx = targetCanvas.getContext('2d');
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      
      // Choose active effects based on beat and randomness
      const activeEffects = this.selectActiveEffects(beatInfo, prng);
      
      // Apply effects in sequence
      let currentCanvas = sourceCanvas;
      let tempCanvas = null;
      
      for (const effect of activeEffects) {
        tempCanvas = new OffscreenCanvas(targetCanvas.width, targetCanvas.height);
        effect.apply(currentCanvas, tempCanvas, beatInfo, prng);
        currentCanvas = tempCanvas;
      }
      
      // Draw final result to target canvas
      ctx.drawImage(currentCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    }
    
    selectActiveEffects(beatInfo, prng) {
      // Simple selection logic - can be enhanced
      const effectCount = Math.floor(1 + prng.next() * 3 * this.intensity);
      const shuffled = [...this.effects].sort(() => 0.5 - prng.next());
      return shuffled.slice(0, effectCount);
    }
  }