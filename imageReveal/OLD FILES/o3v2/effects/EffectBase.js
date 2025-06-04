
export default class EffectBase {
  constructor({gl,ctx2d,canvas,image,intensity=0.8,prng}){
    this.gl = gl;
    this.ctx = ctx2d;
    this.canvas = canvas;
    this.image = image;
    this.intensity = intensity;
    this.prng = prng;
  }
  update(){ }
  render(){ }
  setIntensity(i){ this.intensity=i; }
}
