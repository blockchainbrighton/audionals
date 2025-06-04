export class EffectRegistry {
  static _effects = new Map();
  static register(name, clazz) { this._effects.set(name, clazz); }
  static get(name) { return this._effects.get(name); }
  static keys() { return this._effects.keys(); }
}
export default class EffectBase {
  constructor(ctx, opts = {}) {
    if (new.target === EffectBase) throw new TypeError('Abstract');
    this.ctx = ctx;
    this.opts = { intensity: 1, speed: 1, ...opts };
  }
  init(image) {
    this.image = image;
    this.w = this.ctx.canvas.width;
    this.h = this.ctx.canvas.height;
    this.buffer = new OffscreenCanvas(this.w, this.h);
    const b = this.buffer.getContext('2d');
    b.drawImage(image, 0, 0, this.w, this.h);
  }
  draw() { throw 'draw() not implemented'; }
  update(p) {
    this.ctx.save();
    this.draw(Math.max(0, Math.min(1, p)));
    this.ctx.restore();
  }
}
