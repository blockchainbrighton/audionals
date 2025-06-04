
import EffectBase from './EffectBase.js';
export default class Pixelation extends EffectBase {
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

const scale = 1 - progress * this.intensity;
const sw = w * scale;
const sh = h * scale;
ctx.imageSmoothingEnabled = false;
ctx.drawImage(this.image,0,0,sw,sh);
ctx.drawImage(ctx.canvas,0,0,sw,sh,0,0,w,h);

    ctx.restore();
  }
}
