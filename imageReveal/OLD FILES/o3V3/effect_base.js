
export class EffectBase{
  constructor(name='Effect'){
    this.name=name;
  }
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {ImageBitmap} image
   * @param {HTMLCanvasElement} canvas
   * @param {object} options
   */
  init(ctx,image,canvas,options={}){
    this.ctx=ctx;this.image=image;this.canvas=canvas;this.options=options;
  }
  onBeat(progress){}
  /**
   * Draw the effect. `progress` is total reveal progress [0,1].
   * @param {number} progress 
   * @param {number} dt deltaTime ms
   */
  draw(progress,dt){}
}
