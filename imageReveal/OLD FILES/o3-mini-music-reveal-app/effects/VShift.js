import EffectBase, { EffectRegistry } from './EffectBase.js';
class VShift extends EffectBase {
  draw(p) {
    const slices = 30, sliceH = this.h / slices;
    for (let i=0;i<slices;i++){
      const shift = Math.sin((p + i/slices)*Math.PI)*50*this.opts.intensity;
      this.ctx.drawImage(this.buffer,0,i*sliceH,this.w,sliceH,shift,i*sliceH,this.w,sliceH);
    }
  }
}
EffectRegistry.register('VShift', VShift);
export default VShift;
