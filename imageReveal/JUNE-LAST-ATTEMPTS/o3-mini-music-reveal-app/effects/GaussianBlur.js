import EffectBase, { EffectRegistry } from './EffectBase.js';
class GaussianBlur extends EffectBase {
  draw(p){
    const max=20*this.opts.intensity;
    this.ctx.filter=`blur(${max*(1-p)}px)`;
    this.ctx.drawImage(this.buffer,0,0);
    this.ctx.filter='none';
  }
}
EffectRegistry.register('GaussianBlur', GaussianBlur);
export default GaussianBlur;
