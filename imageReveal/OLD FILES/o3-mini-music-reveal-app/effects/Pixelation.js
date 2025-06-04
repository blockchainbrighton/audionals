import EffectBase, { EffectRegistry } from './EffectBase.js';
class Pixelation extends EffectBase {
  draw(p){
    const scale=1-p*this.opts.intensity;
    const step=Math.max(1,Math.floor(20*scale));
    const tmp=new OffscreenCanvas(this.w/step,this.h/step);
    tmp.getContext('2d').drawImage(this.buffer,0,0,tmp.width,tmp.height);
    this.ctx.imageSmoothingEnabled=false;
    this.ctx.drawImage(tmp,0,0,this.w,this.h);
    this.ctx.imageSmoothingEnabled=true;
  }
}
EffectRegistry.register('Pixelation', Pixelation);
export default Pixelation;
