// <scope-canvas> — high-performance oscilloscope visualizer.
// Accepts an AnalyserNode-like via start(analyser).
class ScopeCanvas extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({ mode:'open' });
    this.canvas = document.createElement('canvas');
    this.shadowRoot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha:false });
    this._raf = 0;
    this._analyser = null;
    this._wave = new Float32Array(1024);
    this._tone = null;
    this._mode = 'lissajous';
    this._bg = '#000';
    this._fg = '#7fb8ff';
    this._grad = null;
    this._resize = this._resize.bind(this);
  }
  connectedCallback(){
    this._resize();
    window.addEventListener('resize', this._resize);
  }
  disconnectedCallback(){
    window.removeEventListener('resize', this._resize);
    this.stop();
  }
  setTone(Tone){ this._tone = Tone; }
  start(analyser){
    this.stop();
    this._analyser = analyser;
    this._raf = requestAnimationFrame(()=>this._tick());
  }
  stop(){
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._analyser = null;
    const c = this.canvas, x = this.ctx;
    x.clearRect(0,0,c.width,c.height);
    x.fillStyle = '#000'; x.fillRect(0,0,c.width,c.height);
  }
  _resize(){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = this.getBoundingClientRect();
    this.canvas.width = Math.max(320, rect.width|0) * dpr;
    this.canvas.height = Math.max(240, rect.height|0) * dpr;
    this.canvas.style.width = rect.width+'px';
    this.canvas.style.height = rect.height+'px';
    this._grad = null;
  }
  _tick(){
    if (!this._analyser){ this._raf = requestAnimationFrame(()=>this._tick()); return; }
    const x = this.ctx, c=this.canvas;
    this._analyser.getValue(this._wave);
    x.fillStyle = '#000'; x.fillRect(0,0,c.width,c.height);

    // Build/refresh gradient
    if (!this._grad){
      this._grad = x.createLinearGradient(0,0,c.width, c.height);
      this._grad.addColorStop(0,'#2a2a3a');
      this._grad.addColorStop(0.5,'#0b0b0f');
      this._grad.addColorStop(1,'#12121c');
    }
    x.fillStyle = this._grad;
    x.fillRect(0,0,c.width,c.height);

    // Draw waveform
    const n = this._wave.length;
    x.lineWidth = Math.max(1, c.width/1200);
    x.strokeStyle = '#7fb8ff';
    x.beginPath();
    for (let i=0;i<n;i++){
      const t = i/(n-1);
      const vx = t * (c.width-2) + 1;
      const vy = (1 - (this._wave[i]*0.5+0.5)) * (c.height-2) + 1;
      if (i===0) x.moveTo(vx,vy); else x.lineTo(vx,vy);
    }
    x.stroke();

    this._raf = requestAnimationFrame(()=>this._tick());
  }
}
customElements.define('scope-canvas', ScopeCanvas);
export {};