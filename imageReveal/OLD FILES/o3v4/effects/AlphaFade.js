import EffectBase from './EffectBase.js';

/** Alpha fade-in effect */
export default class AlphaFade extends EffectBase {
  init() {
    this.ctx.globalAlpha = 0;
  }
  /** @param {number} t 0‒1 */
  update(t) {
    this.ctx.globalAlpha = t * this.intensity;
  }
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
  }
}

EffectBase.register(AlphaFade);
