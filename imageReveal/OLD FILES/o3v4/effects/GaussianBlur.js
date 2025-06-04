import EffectBase from './EffectBase.js';

/** Gaussian blur reveal (sharpens over time) */
export default class GaussianBlur extends EffectBase {
  /** @param {number} t 0‒1 */
  update(t) {
    const radius = (1 - t) * 30 * this.intensity; // px
    this.ctx.filter = `blur(${radius}px)`;
  }
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = 'none';
  }
}

EffectBase.register(GaussianBlur);
