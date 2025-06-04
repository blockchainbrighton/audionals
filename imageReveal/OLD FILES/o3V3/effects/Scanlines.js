
import {EffectBase} from '../effect_base.js';
export default class Scanlines extends EffectBase{
  constructor(){super('Scanlines');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.drawImage(image,0,0,canvas.width,canvas.height);
const lineHeight=2;
ctx.fillStyle='rgba(0,0,0,'+(1-progress)+')';
for(let y=0;y<canvas.height;y+=lineHeight*2){
  ctx.fillRect(0,y,canvas.width,lineHeight);
}

    ctx.restore();
  }
}
