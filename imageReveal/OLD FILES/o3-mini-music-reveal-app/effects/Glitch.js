import EffectBase, { EffectRegistry } from './EffectBase.js';
class Glitch extends EffectBase {
  draw(p){
    this.ctx.drawImage(this.buffer,0,0);
    const slices=10;
    for(let i=0;i<slices;i++){
      const sy=this.h/slices*i, sh=this.h/slices;
      const dx=(Math.random()-0.5)*30*(1-p)*this.opts.intensity;
      this.ctx.drawImage(this.buffer,0,sy,this.w,sh,dx,sy,this.w,sh);
    }
    const shift=20*(1-p)*this.opts.intensity;
    this.ctx.globalCompositeOperation='screen';
    this.ctx.filter='contrast(200%)';
    this.ctx.drawImage(this.buffer,shift,0);
    this.ctx.filter='none';
    this.ctx.globalCompositeOperation='source-over';
  }
}
EffectRegistry.register('Glitch', Glitch);
export default Glitch;
