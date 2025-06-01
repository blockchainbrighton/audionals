import EffectBase, { EffectRegistry } from './EffectBase.js';
class RadialReveal extends EffectBase {
  draw(p){
    const end=p*Math.PI*2;
    this.ctx.save();
    this.ctx.beginPath(); this.ctx.moveTo(this.w/2,this.h/2);
    this.ctx.arc(this.w/2,this.h/2,Math.max(this.w,this.h),-Math.PI/2,end-Math.PI/2);
    this.ctx.closePath(); this.ctx.clip();
    this.ctx.drawImage(this.buffer,0,0); this.ctx.restore();
  }
}
EffectRegistry.register('RadialReveal', RadialReveal);
export default RadialReveal;
