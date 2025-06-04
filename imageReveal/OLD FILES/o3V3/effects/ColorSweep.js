
import {EffectBase} from '../effect_base.js';
export default class ColorSweep extends EffectBase{
  constructor(){super('ColorSweep');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.drawImage(image,0,0,canvas.width,canvas.height);
const sweepX=canvas.width*progress;
ctx.fillStyle='rgba(0,0,0,0.6)';
ctx.fillRect(sweepX,0,canvas.width-sweepX,canvas.height);

    ctx.restore();
  }
}
