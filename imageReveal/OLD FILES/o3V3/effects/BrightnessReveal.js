
import {EffectBase} from '../effect_base.js';
export default class BrightnessReveal extends EffectBase{
  constructor(){super('BrightnessReveal');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.drawImage(image,0,0,canvas.width,canvas.height);
ctx.globalCompositeOperation='destination-in';
const threshold=progress;
const grd=ctx.createLinearGradient(0,0,canvas.width,0);
grd.addColorStop(0,'rgba(255,255,255,'+threshold+')');
grd.addColorStop(1,'rgba(255,255,255,1)');
ctx.fillStyle=grd;
ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.globalCompositeOperation='source-over';

    ctx.restore();
  }
}
