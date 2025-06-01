
import EffectBase from './EffectBase.js';
export default class AlphaFade extends EffectBase {
  constructor(opts) {
    super(opts);
    this.time=0;
  }
  update({dt, progress}) {
    this.time += dt;

  }
  render() {

    const ctx = this.ctx;
    if(!ctx) return;
    const w = this.canvas.width, h=this.canvas.height;
    ctx.save();

const alpha = progress;
ctx.globalAlpha = alpha;
ctx.drawImage(this.image, 0,0,w,h);

    ctx.restore();
  }
}
