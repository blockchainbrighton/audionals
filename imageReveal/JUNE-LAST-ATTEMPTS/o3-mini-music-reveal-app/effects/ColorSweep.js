import EffectBase, { EffectRegistry } from './EffectBase.js';
class ColorSweep extends EffectBase {
  draw(p){
    this.ctx.drawImage(this.buffer,0,0);
    const grad=this.ctx.createLinearGradient(0,0,this.w*p,this.h);
    grad.addColorStop(0,`hsl(${360*p},100%,50%)`);
    grad.addColorStop(1,'transparent');
    this.ctx.globalCompositeOperation='hue';
    this.ctx.fillStyle=grad;
    this.ctx.fillRect(0,0,this.w,this.h);
    this.ctx.globalCompositeOperation='source-over';
  }
}
EffectRegistry.register('ColorSweep', ColorSweep);
export default ColorSweep;
