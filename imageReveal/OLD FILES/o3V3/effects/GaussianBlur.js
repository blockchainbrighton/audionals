
import {EffectBase} from '../effect_base.js';
export default class GaussianBlur extends EffectBase{
  constructor(){super('GaussianBlur');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.filter='blur('+((1-progress)*20).toFixed(2)+'px)';
ctx.drawImage(image,0,0,canvas.width,canvas.height);
ctx.filter='none';

    ctx.restore();
  }
}
