
import {EffectBase} from '../effect_base.js';
export default class Pixelation extends EffectBase{
  constructor(){super('Pixelation');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

const pixelSize=Math.max(1, Math.round((1-progress)*50));
const tempCanvas=document.createElement('canvas');
tempCanvas.width=canvas.width/pixelSize;
tempCanvas.height=canvas.height/pixelSize;
const tctx=tempCanvas.getContext('2d');
tctx.drawImage(image,0,0,tempCanvas.width,tempCanvas.height);
ctx.imageSmoothingEnabled=false;
ctx.drawImage(tempCanvas,0,0,tempCanvas.width,tempCanvas.height,0,0,canvas.width,canvas.height);
ctx.imageSmoothingEnabled=true;

    ctx.restore();
  }
}
