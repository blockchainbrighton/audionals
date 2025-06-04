
import {EffectBase} from '../effect_base.js';
export default class GlyphReveal extends EffectBase{
  constructor(){super('GlyphReveal');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.fillStyle='#0f0';
const fontSize=12;
ctx.font=fontSize+'px monospace';
const cols=Math.ceil(canvas.width/fontSize);
const rows=Math.ceil(canvas.height/fontSize);
for(let y=0;y<rows;y++){
  for(let x=0;x<cols;x++){
    if(Math.random()<progress){
      ctx.drawImage(image,x*fontSize,y*fontSize,fontSize,fontSize,x*fontSize,y*fontSize,fontSize,fontSize);
    }else{
      ctx.fillText(String.fromCharCode(0x30A0+Math.floor(Math.random()*96)),x*fontSize,y*fontSize+fontSize);
    }
  }
}

    ctx.restore();
  }
}
