import EffectBase, { EffectRegistry } from './EffectBase.js';
class RippleDistortion extends EffectBase {
  draw(p){
    const r=Math.max(this.w,this.h)*p;
    this.ctx.save();
    this.ctx.beginPath(); this.ctx.arc(this.w/2,this.h/2,r,0,Math.PI*2); this.ctx.clip();
    this.ctx.drawImage(this.buffer,0,0); this.ctx.restore();
  }
}
EffectRegistry.register('RippleDistortion', RippleDistortion);
export default RippleDistortion;
