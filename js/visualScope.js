import { clamp } from './utils.js';

class OscScope extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '280px';
    this.canvas.style.display = 'block';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.background = 'radial-gradient(1000px 600px at 20% 20%, rgba(255,255,255,0.05), rgba(0,0,0,0))';
    this.shadowRoot.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.analyser = null;
    this.recipe = { id: 'default', mode: 'lissajous', hue: 180, thickness: 1, complexity: 4 };
    this.active = true;
    this._frame = null;
    this._buffer = new Float32Array(1024);
  }

  connectedCallback() {
    this._resize();
    this._loop();
    window.addEventListener('resize', this._resize);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._frame);
    window.removeEventListener('resize', this._resize);
  }

  attributeChangedCallback() {
    this._resize();
  }

  setAnalyser(analyser) { this.analyser = analyser; }
  setRecipe(recipe) { if (recipe) this.recipe = recipe; }
  setActive(active) { this.active = !!active; }

  _resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(200, Math.floor(rect.height));
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  _loop = () => {
    this._frame = requestAnimationFrame(this._loop);
    this._draw();
  };

  _draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const w = width / (window.devicePixelRatio || 1);
    const h = height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // background grid subtle
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      const y = (i / 11) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    if (!this.analyser || !this.active) return;

    const buffer = this._buffer;
    const values = this.analyser.getValue();
    for (let i = 0; i < buffer.length && i < values.length; i++) buffer[i] = values[i];

    const mode = this.recipe.mode;
    const hue = this.recipe.hue;
    const thickness = this.recipe.thickness;
    const complexity = this.recipe.complexity;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
    ctx.lineWidth = thickness;
    ctx.beginPath();

    if (mode === 'lissajous') {
      // Lissajous curve using two frequencies from buffer
      const a = 2 + (complexity % 5);
      const b = 3 + (complexity % 7);
      const delta = Math.PI / 2;
      const scale = Math.min(w, h) * 0.38;
      for (let i = 0; i < 600; i++) {
        const t = i / 600 * Math.PI * 2;
        const x = Math.sin(a * t + delta) * scale * (0.6 + 0.4 * buffer[(i * 2) % buffer.length]);
        const y = Math.sin(b * t) * scale * (0.6 + 0.4 * buffer[(i * 3) % buffer.length]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    } else if (mode === 'spiral') {
      const turns = 2 + complexity;
      const scale = Math.min(w, h) * 0.45;
      for (let i = 0; i < 800; i++) {
        const t = i / 800 * Math.PI * 2 * turns;
        const r = (i / 800) * scale * (0.6 + 0.4 * (buffer[i % buffer.length] + 1) / 2);
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    } else if (mode === 'radial') {
      const rays = 40 + complexity * 6;
      const scale = Math.min(w, h) * 0.45;
      for (let i = 0; i < rays; i++) {
        const t = (i / rays) * Math.PI * 2;
        const r = scale * (0.3 + 0.7 * (buffer[(i * 13) % buffer.length] + 1) / 2);
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        if (i === 0) ctx.moveTo(0, 0); else ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
      }
    } else if (mode === 'poly') {
      const n = 5 + (complexity % 5);
      const scale = Math.min(w, h) * 0.42;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2;
        const r = scale * (0.7 + 0.3 * (buffer[(i * 31) % buffer.length] + 1) / 2);
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }
}

customElements.define('osc-scope', OscScope);