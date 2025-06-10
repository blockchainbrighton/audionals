export class Input {
    constructor(canvas) {
      this.canvas = canvas;
      this.mouse = { x: 0, y: 0, down: false };
      this.keys = {};
      this._listen();
    }
  
    _listen() {
      this.canvas.addEventListener('mousemove', e => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      });
      this.canvas.addEventListener('mousedown', () => { this.mouse.down = true; });
      this.canvas.addEventListener('mouseup', () => { this.mouse.down = false; });
      window.addEventListener('keydown', e => { this.keys[e.key] = true; });
      window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    }
  }
  