
import {EffectBase} from '../effect_base.js';
export default class RippleDistortion extends EffectBase{
  constructor(){super('RippleDistortion');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.drawImage(image,0,0,canvas.width,canvas.height);
// simple radial fade
const grd=ctx.createRadialGradient(canvas.width/2,canvas.height/2,progress*0,canvas.width/2,canvas.height/2,canvas.width/2);
grd.addColorStop(0,'rgba(255,255,255,0)');
grd.addColorStop(progress,'rgba(255,255,255,0)');
grd.addColorStop(1,'rgba(255,255,255,'+(1-progress)+')');
ctx.fillStyle=grd;
ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.restore();
  }
}
