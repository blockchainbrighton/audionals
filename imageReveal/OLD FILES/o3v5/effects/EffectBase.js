export default class EffectBase {
  constructor(options = {}) {
    this.options = options;
  }
  static register(effectClass) {
    if (!window.effectRegistry) window.effectRegistry = [];
    window.effectRegistry.push(effectClass);
  }
  /* eslint-disable no-unused-vars */
  init(image, canvas) {}
  update(t) {}
  render(ctx, image, canvas) {}
  /* eslint-enable */
}
