import EffectBase, { EffectRegistry } from './EffectBase.js';
class InkDiffusion extends EffectBase {
  draw(p){
    const blotches=30;
    this.ctx.drawImage(this.buffer,0,0);
    this.ctx.globalCompositeOperation='destination-in';
    for(let i=0;i<blotches;i++){
      const r=Math.random()*Math.max(this.w,this.h)*p;
      const x=Math.random()*this.w, y=Math.random()*this.h;
      const grd=this.ctx.createRadialGradient(x,y,0,x,y,r);
      grd.addColorStop(0,'white'); grd.addColorStop(1,'transparent');
      this.ctx.fillStyle=grd; this.ctx.beginPath(); this.ctx.arc(x,y,r,0,Math.PI*2); this.ctx.fill();
    }
    this.ctx.globalCompositeOperation='source-over';
  }
}
EffectRegistry.register('InkDiffusion', InkDiffusion);
export default InkDiffusion;
