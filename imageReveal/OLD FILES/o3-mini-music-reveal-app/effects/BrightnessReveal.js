import EffectBase, { EffectRegistry } from './EffectBase.js';
class BrightnessReveal extends EffectBase {
  draw(p){
    this.ctx.drawImage(this.buffer,0,0);
    this.ctx.globalCompositeOperation='destination-in';
    const grd=this.ctx.createRadialGradient(this.w/2,this.h/2,0,this.w/2,this.h/2,Math.max(this.w,this.h)*p);
    grd.addColorStop(0,'white'); grd.addColorStop(1,'transparent');
    this.ctx.fillStyle=grd; this.ctx.fillRect(0,0,this.w,this.h);
    this.ctx.globalCompositeOperation='source-over';
  }
}
EffectRegistry.register('BrightnessReveal', BrightnessReveal);
export default BrightnessReveal;
