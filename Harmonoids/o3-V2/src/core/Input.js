/**
 * Keyboard + mouse abstraction.
 * @module core/Input
 */
export class Input {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, down: false };

    addEventListener('keydown', e => this.keys.add(e.code));
    addEventListener('keyup', e => this.keys.delete(e.code));

    el.addEventListener('pointerdown', e => {
      this.pointer.down = true;
      this._updatePointer(e, el);
    });
    addEventListener('pointerup', () => (this.pointer.down = false));
    addEventListener('pointermove', e => this._updatePointer(e, el));
  }

  /** @param {PointerEvent} e @param {HTMLElement} el */
  _updatePointer(e, el) {
    const rect = el.getBoundingClientRect();
    this.pointer.x = (e.clientX - rect.left) * (el.width / rect.width);
    this.pointer.y = (e.clientY - rect.top) * (el.height / rect.height);
  }

  /** Convenience */
  isDown(code) { return this.keys.has(code); }
}
