// File: scope-canvas.js
class ScopeCanvas extends HTMLElement {
  #canvas;
  #ctx;
  #animId = null;
  #mode = 'seed'; // 'seed' or 'live'
  #shape = 'circle';
  #presets = {};
  #seed = '5s567g67';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        canvas {
          border-radius: 12px;
          border: 1px solid #333;
          background: #000;
          box-shadow: 0 0 30px #0008;
          display: block;
        }
      </style>
      <canvas width="600" height="600"></canvas>
    `;
    this.#canvas = this.shadowRoot.querySelector('canvas');
    this.#ctx = this.#canvas.getContext('2d');

    this.SHAPES = ['circle','square','butterfly','lissajous','spiro','harmonograph'];

    // Precompute deterministic presets for all shapes
    for (const shape of this.SHAPES) {
      this.#presets[shape] = this.deterministicPreset(this.#seed, shape);
    }
  }

  connectedCallback() {
    this.startAnimation();
  }

  disconnectedCallback() {
    this.stopAnimation();
  }

  // Exposed setters for mode, shape and seed (only shape and mode used externally)
  set mode(val) {
    this.#mode = val;
  }
  set shape(val) {
    if (this.SHAPES.includes(val)) this.#shape = val;
  }
  // Called by orchestrator to provide latest analyser data for live mode
  renderLiveBuffer(buffer) {
    this.#render(buffer);
  }

  // Internal deterministic PRNG
  mulberry32(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return () => ((a = Math.imul(a ^ (a >>> 15), 1 | a)), (a >>> 16) / 0x10000);
  }

  deterministicPreset(seed, shape) {
    const rng = this.mulberry32(seed + "_" + shape);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const modeRoll = rng();
    let mode = 1;
    if (modeRoll < 0.18) mode = 0;
    else if (modeRoll < 0.56) mode = 1;
    else if (modeRoll < 0.85) mode = 2;
    else mode = 3;
    let lfoRate;
    if (mode === 0)      lfoRate = 0.07 + rng()*0.3;
    else if (mode === 1) lfoRate = 0.25 + rng()*8;
    else if (mode === 2) lfoRate = 6 + rng()*20;
    else                 lfoRate = 24 + rng()*36;
    let lfoMin, lfoMax;
    if (mode === 0) {
        lfoMin = 400 + rng()*400;
        lfoMax = 900 + rng()*600;
    } else if (mode === 1) {
        lfoMin = 120 + rng()*700;
        lfoMax = 1200 + rng()*1400;
    } else {
        lfoMin = 80 + rng()*250;
        lfoMax = 1500 + rng()*3500;
    }
    const oscCount = mode === 3 ? 2 + (rng() > 0.7 ? 1 : 0) : 1 + (rng() > 0.6 ? 1 : 0);
    const oscs = [];
    for (let i = 0; i < oscCount; ++i) {
        oscs.push([types[(rng()*types.length)|0], notes[(rng()*notes.length)|0]]);
    }
    const filterBase = mode === 0 ? 700 + rng()*500 : 300 + rng()*2400;
    const resonance = 0.6 + rng()*0.7;
    let env = {};
    if (mode === 0) {
        env = { attack: 0.005 + rng()*0.03, decay: 0.04 + rng()*0.08, sustain: 0.1 + rng()*0.2, release: 0.03 + rng()*0.1 };
    } else if (mode === 3) {
        env = { attack: 2 + rng()*8, decay: 4 + rng()*20, sustain: 0.7 + rng()*0.2, release: 8 + rng()*24 };
    } else {
        env = { attack: 0.03 + rng()*0.4, decay: 0.1 + rng()*0.7, sustain: 0.2 + rng()*0.5, release: 0.2 + rng()*3 };
    }
    const reverbWet = (mode === 3 ? 0.4 + rng()*0.5 : 0.1 + rng()*0.5);
    const reverbRoom = (mode === 3 ? 0.85 + rng()*0.12 : 0.6 + rng()*0.38);
    const colorSpeed = 0.06 + rng()*0.22;
    const shapeDrift = 0.0006 + rng()*0.0032;
    return {
        osc1: oscs[0],
        osc2: oscs[1] || null,
        filter: filterBase,
        filterQ: resonance,
        lfo: [lfoRate, lfoMin, lfoMax],
        envelope: env,
        reverb: { wet: reverbWet, roomSize: reverbRoom },
        colorSpeed,
        shapeDrift
    };
  }

  // Seed buffer generator for visual-only mode (silent)
  makeSeedBuffer(shape, seed, len=2048) {
    const rng = this.mulberry32(seed + "_" + shape);
    const arr = new Float32Array(len);
    for(let i=0; i<len; ++i) {
      const t = i/len;
      const base = Math.sin(2*Math.PI*t + rng()*6.28);
      const harm2 = 0.5 * Math.sin(4*Math.PI*t + rng()*6.28);
      const harm3 = 0.25 * Math.sin(6*Math.PI*t + rng()*6.28);
      arr[i] = 0.6*base + 0.3*harm2 + 0.15*harm3;
    }
    return arr;
  }

  // Drawing functions (copied and slightly reformatted from original)
  drawFuncs = {
    circle: (data,t,pr) => {
      const S = 0.8*this.#canvas.width/2, c=300;
      this.#ctx.beginPath();
      for(let i=0; i<data.length; ++i){
        let a = i/data.length*2*Math.PI + t*0.001,
            amp = (data[i]+1)/2,
            r = S*amp,
            x = c + Math.cos(a)*r,
            y = c + Math.sin(a)*r;
        i ? this.#ctx.lineTo(x,y) : this.#ctx.moveTo(x,y);
      }
      this.#ctx.closePath();
      this.#ctx.stroke();
    },
    square: (data,t,pr) => {
      const S = 0.8*this.#canvas.width/Math.SQRT2,
            c = 300,
            o = (600 - S)/2;
      this.#ctx.beginPath();
      for(let i=0; i<data.length; ++i) {
        let p = i/data.length,
            amp = (data[i]+1)/2,
            x, y;
        if (p < 0.25) [x,y] = [o + S*(p/0.25), o];
        else if (p < 0.5) [x,y] = [o + S, o + S*((p-0.25)/0.25)];
        else if (p < 0.75) [x,y] = [o + S - S*((p-0.5)/0.25), o + S];
        else [x,y] = [o, o + S - S*((p-0.75)/0.25)];
        let dx = x - c,
            dy = y - c,
            fx = c + dx*(0.8 + 0.2*amp) + Math.sin(t*0.0005)*10,
            fy = c + dy*(0.8 + 0.2*amp) + Math.cos(t*0.0006)*10;
        i ? this.#ctx.lineTo(fx, fy) : this.#ctx.moveTo(fx, fy);
      }
      this.#ctx.closePath();
      this.#ctx.stroke();
    },
    butterfly: (data,t,pr) => {
      const S = 0.4*this.#canvas.width,
            c = 300;
      this.#ctx.beginPath();
      for(let i=0; i<data.length; ++i){
        let th = i/data.length*Math.PI*24 + t*0.0003,
            amp = (data[i]+1)/2,
            scale = Math.exp(Math.cos(th)) - 2*Math.cos(4*th) + Math.pow(Math.sin(th/12),5),
            x = Math.sin(th)*scale*S*(0.5+0.5*amp) + c,
            y = Math.cos(th)*scale*S*(0.5+0.5*amp) + c;
        i ? this.#ctx.lineTo(x,y) : this.#ctx.moveTo(x,y);
      }
      this.#ctx.closePath();
      this.#ctx.stroke();
    },
    lissajous: (data,t,pr) => {
      const S = 0.8*this.#canvas.width/3,
            c = 300,
            avg = data.reduce((a,b)=>a+Math.abs(b),0)/data.length,
            freqX = 3 + Math.sin(t*0.0003)*1.5,
            freqY = 2 + Math.cos(t*0.0004)*1.5,
            phase = t*0.0005;
      this.#ctx.beginPath();
      for(let i=0; i<data.length; i++){
        let theta = i/data.length*2*Math.PI,
            r = avg*(0.5 + 0.5*data[i]),
            x = c + Math.sin(freqX*theta + phase)*S*r,
            y = c + Math.sin(freqY*theta)*S*r;
        i ? this.#ctx.lineTo(x,y) : this.#ctx.moveTo(x,y);
      }
      this.#ctx.stroke();
    },
    spiro: (data,t,pr) => {
      const S = 0.6*this.#canvas.width/3,
            c = 300,
            inner = 0.3 + Math.sin(t*0.0002)*0.2,
            outer = 0.7,
            ratio = 0.21 + 0.02*Math.sin(t*0.0001);
      this.#ctx.beginPath();
      for(let i=0; i<data.length; i++){
        let theta = i/data.length*2*Math.PI,
            waveAmp = (data[i]+1)/2,
            x = c + (S*(outer - inner)*Math.cos(theta) + S*inner*Math.cos((outer-inner)/inner*theta + t*ratio))*(0.8 + 0.2*waveAmp),
            y = c + (S*(outer - inner)*Math.sin(theta) - S*inner*Math.sin((outer-inner)/inner*theta + t*ratio))*(0.8 + 0.2*waveAmp);
        i ? this.#ctx.lineTo(x,y) : this.#ctx.moveTo(x,y);
      }
      this.#ctx.stroke();
    },
    harmonograph: (data,t,pr) => {
      const S = 0.7*this.#canvas.width/4,
            c = 300,
            decay = Math.exp(-t*0.0002),
            avg = (data.reduce((a,b)=>a+b,0)/data.length + 1)*0.5;
      this.#ctx.beginPath();
      for(let i=0; i<data.length; i++){
        let theta = i/data.length*2*Math.PI,
            x = c + decay * S * (Math.sin(3*theta + t*0.0003)*0.7 + Math.sin(5*theta + t*0.0004)*0.3) * (0.5 + 0.5*data[i]),
            y = c + decay * S * (Math.sin(4*theta + t*0.00035)*0.6 + Math.sin(6*theta + t*0.00025)*0.4) * (0.5 + 0.5*data[i]);
        i ? this.#ctx.lineTo(x,y) : this.#ctx.moveTo(x,y);
      }
      this.#ctx.stroke();
    }
  }

  #render(buffer) {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    const pr = this.#presets[this.#shape];
    const t = performance.now();
    const avg = this.#mode === 'seed' ? 0.5 : 0.5;
    const hue = (t * pr.colorSpeed) % 360;
    const sat = 70 + avg*30;
    const light = 50 + avg*20;
    this.#ctx.strokeStyle = `hsl(${hue},${sat}%,${light}%)`;
    this.#ctx.lineWidth = 2;
    this.#ctx.lineJoin = this.#ctx.lineCap = 'round';

    let buf;
    if (this.#mode === 'seed') {
      buf = this.makeSeedBuffer(this.#shape, this.#seed);
    } else {
      buf = buffer || new Float32Array(2048);
    }
    const drawFn = this.drawFuncs[this.#shape] || this.drawFuncs.circle;
    drawFn(buf, t, pr);
  }

  startAnimation() {
    if (this.#animId) return; // Already animating
    const step = () => {
      if (this.#mode === 'seed') {
        this.#render();
      }
      this.#animId = requestAnimationFrame(step);
    };
    step();
  }

  stopAnimation() {
    if (this.#animId) {
      cancelAnimationFrame(this.#animId);
      this.#animId = null;
    }
  }
}

customElements.define('scope-canvas', ScopeCanvas);
