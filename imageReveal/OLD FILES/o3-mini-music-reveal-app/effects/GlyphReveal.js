import EffectBase, { EffectRegistry } from './EffectBase.js';
const glyphs='アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴ'.split('');
class GlyphReveal extends EffectBase {
  draw(p){
    const cell=8;
    for(let y=0;y<this.h;y+=cell){
      for(let x=0;x<this.w;x+=cell){
        if(Math.random()<p){
          this.ctx.drawImage(this.buffer,x,y,cell,cell,x,y,cell,cell);
        }else{
          this.ctx.fillStyle='#0f0';
          this.ctx.font=`${cell}px monospace`;
          this.ctx.fillText(glyphs[Math.floor(Math.random()*glyphs.length)],x,y+cell);
        }
      }
    }
  }
}
EffectRegistry.register('GlyphReveal', GlyphReveal);
export default GlyphReveal;
