
import EffectBase from './EffectBase.js';
export default class VShift extends EffectBase {
  constructor(opts) {
    super(opts);
    this.time=0;
  }
  update({dt, progress}) {
    this.time += dt;

  }
  render() {
    if(this.gl){ return; }
    const ctx = this.ctx;
    if(!ctx) return;
    const w = this.canvas.width, h=this.canvas.height;
    ctx.save();

const slices = 20;
const slH = h / slices;
for(let i=0;i<slices;i++){
  const offset = Math.sin(progress*Math.PI*2 + i) * slH * this.intensity;
  ctx.drawImage(this.image,
    0,i*slH,w,slH,
    offset, i*slH, w, slH);
}

    ctx.restore();
  }
}
