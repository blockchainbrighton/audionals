/**
 * Heads-up display & panels.
 * @module ui/HUD
 */
export class HUD {
  /** @param {import('../core/Engine.js').Engine} engine */
  constructor(engine) {
    this.engine = engine;
    this.hud = document.getElementById('hud');
    this._build();
  }

  _build() {
    this.startBtn = this._button('⏵', () => (this.engine.paused = false));
    this.pauseBtn = this._button('⏸', () => (this.engine.paused = true));
    this.manualDrop = this._button('Drop', async () => {
      // Spawn standard entity mid-air
      const { Harmonoid } = await import('../entities/Harmonoid.js');
      this.engine.entities.push(new Harmonoid({
        x: 100, y: 0, pitch: 60,
      }));
    });
    this.hud.append(this.startBtn, this.pauseBtn, this.manualDrop);
  }

  _button(label, fn) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    return b;
  }

  /** @param {import('../entities/Harmonoid.js').Harmonoid[]} ents */
  update(ents) {
    this.hud.dataset.stats = `Total:${ents.length}`;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    // Nothing canvas-based yet – DOM covers HUD
  }
}
