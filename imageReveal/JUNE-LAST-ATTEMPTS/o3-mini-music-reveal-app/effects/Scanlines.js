import EffectBase, { EffectRegistry } from './EffectBase.js';
class Scanlines extends EffectBase {
  draw(p){
    this.ctx.drawImage(this.buffer,0,0);
    const lineH=2;
    this.ctx.fillStyle=`rgba(0,0,0,${0.5*(1-p)*this.opts.intensity})`;
    for(let y=0;y<this.h;y+=lineH*2){ this.ctx.fillRect(0,y,this.w,lineH); }
  }
}
EffectRegistry.register('Scanlines', Scanlines);
export default Scanlines;
