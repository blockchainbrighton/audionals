import EffectBase, { EffectRegistry } from './EffectBase.js';
class AlphaFade extends EffectBase {
  draw(p){ this.ctx.globalAlpha=p; this.ctx.drawImage(this.buffer,0,0); }
}
EffectRegistry.register('AlphaFade', AlphaFade);
export default AlphaFade;
