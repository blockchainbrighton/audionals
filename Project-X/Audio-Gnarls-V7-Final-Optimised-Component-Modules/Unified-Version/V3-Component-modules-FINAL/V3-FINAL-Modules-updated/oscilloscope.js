// oscilloscope.js
// Canvas-based oscilloscope with audio analyser input.
// Zero-latency rendering using requestAnimationFrame and direct FFT access.

class Oscilloscope extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.analyser = null;
      this.isAudioStarted = false;
      this.isPlaying = false;
      this.shapeKey = 'circle';
      this.mode = 'seed'; // 'seed' or 'live'
      this.preset = null;
  
      this.canvas = null;
      this.ctx = null;
      this.animationId = null;
      this.bufferLength = 2048;
      this.dataArray = null;
  
      this.draw = this.draw.bind(this);
      this.onIndicatorUpdate = null;
    }
  
    connectedCallback() {
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
      `;
  
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.ctx.fillStyle = 'black';
      this.ctx.strokeStyle = 'white';
  
      this.shadowRoot.append(style, this.canvas);
  
      window.addEventListener('resize', () => this.resizeCanvas(), { passive: true });
      this.resizeCanvas();
  
      if (this.analyser) this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.draw();
    }
  
    resizeCanvas() {
      const { clientWidth, clientHeight } = this;
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = clientWidth * dpr;
      this.canvas.height = clientHeight * dpr;
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = clientWidth + 'px';
      this.canvas.style.height = clientHeight + 'px';
    }
  
    draw() {
      this.animationId = requestAnimationFrame(this.draw);
  
      if (!this.isPlaying) {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        return;
      }
  
      this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  
      if (!this.analyser || !this.dataArray) return;
  
      this.analyser.getByteFrequencyData(this.dataArray);
  
      const { width, height } = this.canvas;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;
  
      const avg = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
      const intensity = avg / 255;
  
      this.ctx.beginPath();
      for (let i = 0; i < 360; i += 2) {
        const angle = (i * Math.PI) / 180;
        let r = radius * (1 + intensity * 0.5);
        let x, y;
  
        switch (this.shapeKey) {
          case 'circle':
            x = centerX + r * Math.cos(angle);
            y = centerY + r * Math.sin(angle);
            break;
          case 'square':
            const a = angle % (Math.PI / 2);
            const d = (Math.cos(a) > Math.sin(a) ? Math.cos(a) : Math.sin(a)) * 2;
            x = centerX + (r / d) * Math.cos(angle);
            y = centerY + (r / d) * Math.sin(angle);
            break;
          case 'butterfly':
            const b = Math.exp(Math.cos(angle)) - 2 * Math.cos(4 * angle) - Math.pow(Math.sin(angle / 12), 5);
            r *= b * 0.3 + 0.7;
            x = centerX + r * Math.cos(angle);
            y = centerY + r * Math.sin(angle);
            break;
          default:
            x = centerX + r * Math.cos(angle);
            y = centerY + r * Math.sin(angle);
        }
  
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.strokeStyle = `hsl(${(Date.now() * 0.06) % 360}, 80%, 60%)`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  
    disconnectedCallback() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      window.removeEventListener('resize', this.resizeCanvas);
    }
  }
  
  customElements.define('scope-canvas', Oscilloscope);