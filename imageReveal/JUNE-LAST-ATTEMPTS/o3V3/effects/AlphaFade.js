
import {EffectBase} from '../effect_base.js';
export default class AlphaFade extends EffectBase{
  constructor(){super('AlphaFade');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.globalAlpha=progress;
ctx.drawImage(image,0,0,canvas.width,canvas.height);
ctx.globalAlpha=1;

    ctx.restore();
  }
}
