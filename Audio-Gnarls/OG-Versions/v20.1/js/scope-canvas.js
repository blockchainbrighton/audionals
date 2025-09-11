
/* ScopeCanvas – Oscilloscope Visual Renderer (public API unchanged) */
(() => {
  const { sin, cos, abs, PI, pow, SQRT2, imul, min, max } = Math;
  const TAU = PI * 2;
  const theta = (i, n, ph = 0) => (i / n) * TAU + ph;
  const norm = v => (v + 1) * 0.5;

  // ---- Config ---------------------------------------------------------------
  const DEFAULTS = {
    PROB: {
      'mono-prob':             0.02,
      'half-dominant-prob':    0.05,
      'group-strobe-prob':     0.01,
      'dark-palette-prob':     0.01,
      'neutral-palette-prob':  0.05,
    },
    HALF_DOMINANT_RATIO: 0.5,
    CYCLER_SPEEDS: { slow:0.03, medium:0.06, fast:0.12, lightning:0.6 },
    EFFECT_WEIGHTS: { none:60, glow:25, strobe:10, neon:5 },
    CYC_SPEED_WEIGHTS: { slow:25, medium:40, fast:25, lightning:10 },

    // base bright palette
    COLOR_WEIGHTS: {
      bitcoin_orange: 3, stacks_purple: 2, deep_purple: 2, light_magenta: 3,
      shocking_pink: 4, royal_blue: 10, dark_green: 3,
      bright_pink: 6, bright_red: 12, dark_red: 6,
      bright_yellow: 1, gold: 1,
      white: 3, dark_gray: 2, 
      cycler: 3
    },

    // dark-biased
    DARK_COLOR_WEIGHTS: {
      extra_dark_purple:2, very_dark_blue:2, very_dark_green:3, dark_red:5,
      extra_dark_gray:3, charcoal:2, near_black:1, gold:1
    },

    // neutral-biased
    NEUTRAL_COLOR_WEIGHTS: {
      near_black:4, extra_dark_gray:5, charcoal:5, dark_gray:5,
      slate_gray:4, dim_gray:4, silver:3, gainsboro:3, off_white:4, white:3
    },

    NAMED_COLORS: {
      bitcoin_orange:'#F7931A',
      stacks_purple:'#5546FF', deep_purple:'#4B1EFF', light_magenta:'#FF4FD8',
      shocking_pink:'#FF00A8', bright_pink:'#FF1493', bright_red:'#FF1A1A',
      dark_red:'#6A0000', royal_blue:'#0726a2ff', dark_green:'#017210ff',
      bright_yellow:'#FFD400', gold:'#FFD700',
      white:'#FFFFFF', dark_gray:'rgba(16,16,24,0.40)', 
      stacks_purple_dark:'#241E72', extra_dark_purple:'#1C0033',
      very_dark_blue:'#0B1E3A', very_dark_green:'#012B1B',
      extra_dark_gray:'#0F1014', charcoal:'#14161C', slate_gray:'#2A2F3A',
      dim_gray:'#6E6E73', silver:'#C0C0C8', gainsboro:'#DDDEE3'
    }
  };

  const DARK_COLOR_KEYS    = Object.keys(DEFAULTS.DARK_COLOR_WEIGHTS);
  const NEUTRAL_COLOR_KEYS = Object.keys(DEFAULTS.NEUTRAL_COLOR_WEIGHTS);

  // ---- Tiny helpers ---------------------------------------------------------
  const _hash32 = str => { let a = 0; for (let i=0;i<str.length;i++) a = (a<<5) - a + str.charCodeAt(i); return a|0; };
  const _rngFrom = str => { let s=_hash32(str); return () => { s=(s+0x6D2B79F5)|0; let t=imul(s^(s>>>15),1|s); t=(t+imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; };
  const _jsonAttr = (el, name, fallback) => { try { const raw = el?.getAttribute?.(name); if (!raw) return fallback; const obj = JSON.parse(raw); return (obj && typeof obj === 'object') ? obj : fallback; } catch { return fallback; } };
  const _pickWeightedKey = (rand, weights) => {
    const keys = Object.keys(weights); if (!keys.length) return null;
    const positives = keys.map(k => max(0, +weights[k] || 0));
    const sum = positives.reduce((a,b)=>a+b,0);
    if (sum <= 0) return keys[0];
    let r = rand() * sum;
    for (let i=0;i<keys.length;i++){ r -= positives[i]; if (r <= 0) return keys[i]; }
    return keys.at(-1);
  };
  const _onlyKeys = (weights, allowed) => Object.fromEntries(allowed.filter(k => k in weights).map(k => [k, weights[k]]));
  const _chooseSubset = (rand, items, k) => {
    const arr = items.slice();
    for (let i=arr.length-1;i>0;i--){ const j=(rand()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr.slice(0, k);
  };

  // ---- Shape params ---------------------------------------------------------
  const SHAPE_PARAMS = {
    circle:{freq:1,harmonics:[1,.5,.25],complexity:.3},
    square:{freq:1.5,harmonics:[1,.3,.7,.2],complexity:.6},
    butterfly:{freq:2.2,harmonics:[1,.4,.6,.3,.2],complexity:.8},
    Bowditch:{freq:1.8,harmonics:[1,.6,.4],complexity:.5},
    spiro:{freq:3.1,harmonics:[1,.3,.5,.2,.4],complexity:.9},
    harmonograph:{freq:2.5,harmonics:[1,.7,.5,.3,.2,.1],complexity:1},
    rose:{freq:1.7,harmonics:[1,.4,.3,.2],complexity:.4},
    hypocycloid:{freq:2.8,harmonics:[1,.5,.3,.4],complexity:.7},
    epicycloid:{freq:2.9,harmonics:[1,.4,.5,.3],complexity:.7},
    spiral:{freq:1.3,harmonics:[1,.3,.2],complexity:.4},
    star:{freq:2.1,harmonics:[1,.6,.4,.2],complexity:.6},
    flower:{freq:1.9,harmonics:[1,.5,.3,.4],complexity:.5},
    wave:{freq:1.1,harmonics:[1,.4,.2],complexity:.3},
    mandala:{freq:3.5,harmonics:[1,.3,.4,.2,.3,.1],complexity:1.2},
    infinity:{freq:1.6,harmonics:[1,.5,.3],complexity:.4},
    dna:{freq:2.7,harmonics:[1,.4,.3,.5,.2],complexity:.8},
    tornado:{freq:3.2,harmonics:[1,.3,.6,.2,.4],complexity:1.1},
    hum:{freq:.8,harmonics:[1,.2,.1],complexity:.2},
  };

  class ScopeCanvas extends HTMLElement {
    constructor(){
      super();
      const sh = this.attachShadow({mode:'open'});
      const st = document.createElement('style');
      st.textContent = ':host{display:block;width:100%;height:100%}canvas{display:block;width:100%;height:100%}';
      sh.append(st);
      this._canvas = document.createElement('canvas');
      sh.append(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this.analyser = null;
      this.preset = null;
      this.shapeKey = 'circle';
      this.mode = 'seed';
      this.isAudioStarted = false;
      this.isPlaying = false;
      this.onIndicatorUpdate = null;
      this._plan = null;

      this._dummyData = null; this._liveBuffer = null; this._animId = null;
      this._cssW = 0; this._cssH = 0; this._dpr = 1;

      this._animate = this._animate.bind(this);
      this._resizeCanvas = this._resizeCanvas.bind(this);

      // micro helpers on instance
      this._samp   = (a,i) => (a ? a[i % a.length] ?? 0 : 0);
      this._ampAt  = (a,i) => norm(this._samp(a,i));
      this._avgAbs = a => a.reduce?.((s,v)=>s+abs(v),0)/a.length ?? 0;

      this._withCtx = fn => {
        const cw = this._cssW || this._canvas.clientWidth || this._canvas.width;
        const cx = (this._canvas.width/2)|0, cy = (this._canvas.height/2)|0;
        const c  = min(cx, cy) / (this._dpr || 1);
        return fn(this._ctx, cw, c);
      };

      this._traceParam = (data, map, {close=false}={}) => this._withCtx((ctx, cw, c) => {
        ctx.beginPath();
        for (let i=0,n=data.length;i<n;i++){ const [x,y]=map(i,n,cw,c); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
        if (close) ctx.closePath(); ctx.stroke();
      });

      this._tracePolar = (data, rFn, {phase=0, close=false}={}) =>
        this._traceParam(data,(i,n,cw,c)=>{ const th=theta(i,n,phase), r=rFn(i,n,th,cw,c); return [c+cos(th)*r, c+sin(th)*r]; },{close});

      this._prepareStroke = (cssColor, { effect='none', now=0 } = {}) => {
        const ctx = this._ctx;
        ctx.clearRect(0,0,this._cssW,this._cssH);
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.lineJoin = ctx.lineCap = 'round';

        // effects
        if (effect === 'glow') {
          ctx.shadowBlur = 16; ctx.shadowColor = cssColor;
        } else if (effect === 'neon') {
          ctx.shadowBlur = 28; ctx.shadowColor = cssColor;
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineWidth = 2.6;
        } else if (effect === 'strobe') {
          const hz = 10 + (now % 1000) * 0.002; // 10..12 Hz
          const phase = ((now * hz / 1000) % 1) < 0.5;
          ctx.globalAlpha = phase ? 1 : 0.22;
        }
        ctx.strokeStyle = cssColor;
      };

      const cycloid = k => (data,t) => this._withCtx((ctx,cw,c) => {
        const epi = k==='epi'?1:-1, S=(k==='epi'?0.36:0.39)*cw;
        const n = k==='epi' ? 4+Math.round(3*abs(sin(t*.00021+.5))) : 3+Math.round(3*abs(cos(t*.00023)));
        const R=1, r=1/n, coef=(R+epi*r)/r, ph=k==='epi'?t*.00038:t*.0004;
        this._traceParam(data,(i,N)=>{ const th=theta(i,N,ph), M=.7+.3*this._ampAt(data,i);
          const x=S*((R+epi*r)*cos(th)-epi*r*cos(coef*th))*M, y=S*((R+epi*r)*sin(th)-r*sin(coef*th))*M; return [c+x,c+y];
        },{close:true});
      });

      this.drawFuncs = {
        hum:(d,t)=>this._withCtx((ctx,cw,c)=>{ const R=.33*cw+sin(t*.0002)*5;
          ctx.save(); ctx.globalAlpha=.23+.14*abs(sin(t*.0004));
          ctx.beginPath(); ctx.arc(c,c,R,0,TAU); ctx.stroke();
          const mono = !!(this._plan?.isMono);
          ctx.strokeStyle = mono ? this._getColorFor('hum', t).css : 'hsl(195, 80%, 62%)';
          ctx.globalAlpha=.36;
          ctx.beginPath(); for(let i=0,s=128;i<s;i++){ const th=i/s*TAU, ripple=12*sin(th*3+t*.00045)+6*sin(th*6-t*.00032);
            const r=R+ripple+this._samp(d,i)*7, x=c+cos(th)*r, y=c+sin(th)*r; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
          ctx.closePath(); ctx.stroke(); ctx.restore();
        }),
        circle:(d,t)=>this._withCtx((_,cw,c)=>this._traceParam(d,(i,n)=>{ const th=theta(i,n,t*.001), r=.4*cw*this._ampAt(d,i);
          return [c+cos(th)*r,c+sin(th)*r]; },{close:true})),
        square:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.8*cw/SQRT2, o=(cw-S)/2, jx=sin(t*.0005)*10, jy=cos(t*.0006)*10;
          const seg=p=>p<.25?[o+S*(p/.25),o]:p<.5?[o+S,o+S*((p-.25)/.25)]:p<.75?[o+S-S*((p-.5)/.25),o+S]:[o,o+S-S*((p-.75)/.25)];
          this._traceParam(d,(i,n)=>{ const p=i/n, [x,y]=seg(p); if(!i) return [x,y];
            const A=.8+.2*this._ampAt(d,i); return [c+(x-c)*A+jx, c+(y-c)*A+jy]; },{close:true});
        }),
        butterfly:(d,t)=>this._withCtx(() =>
          this._traceParam(d,(i,n,cw,c)=>{ const th = i/n*PI*28 + t*.00035; const a = pow(this._ampAt(d,i), 1.25);
            const s = Math.exp(.85*cos(th)) - 1.6*cos(5*th) + pow(sin(th/10), 7);
            const r = s * .22 * cw * (.5 + .5*a); return [c + sin(th)*r, c + cos(th)*r]; },{close:true})
        ),
        Bowditch:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.8*cw/3, avg=this._avgAbs(d), fx=3+sin(t*.0003)*1.5, fy=2+cos(t*.0004)*1.5, ph=t*.0005;
          this._traceParam(d,(i,n)=>{ const th=theta(i,n), r=avg*(.5+.5*this._samp(d,i));
            return [c+sin(fx*th+ph)*S*r, c+sin(fy*th)*S*r]; });
        }),
        spiro:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.6*cw/3, inner=.3+sin(t*.0002)*.2, outer=.7, ratio=.21+.02*sin(t*.0001), co=(outer-inner)/inner;
          this._traceParam(d,(i,n)=>{ const th=theta(i,n), w=this._ampAt(d,i), M=.8+.2*w;
            const x=(S*(outer-inner)*cos(th)+S*inner*cos(co*th+t*ratio))*M, y=(S*(outer-inner)*sin(th)-S*inner*sin(co*th+t*ratio))*M; return [c+x,c+y];
          });
        }),
        harmonograph:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.7*cw/4;
          this._traceParam(d,(i,n)=>{ const th=theta(i,n), s1=sin(3*th+t*.0003)*.7+sin(5*th+t*.0004)*.3, s2=sin(4*th+t*.00035)*.6+sin(6*th+t*.00025)*.4, a=.5+.5*this._samp(d,i);
            return [c+S*s1*a, c+S*s2*a];
          });
        }),
        rose:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.42*cw, k=3+Math.round(abs(sin(t*.00025))*4);
          this._tracePolar(d,(_,__,th)=>S*cos(k*th)*(.65+.35*this._ampAt(d,_)),{phase:t*.00035,close:true});
        }),
        hypocycloid: cycloid('hypo'),
        epicycloid:  cycloid('epi'),
        spiral:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.4*cw;
          this._traceParam(d,(i,n)=>{ const th=i/n*TAU*8+t*.0003, r=S*(i/n)*(.6+.4+this._ampAt(d,i)); return [c+cos(th)*r,c+sin(th)*r]; });
        }),
        star:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.45*cw, p=5+Math.round(3*abs(sin(t*.0002)));
          this._tracePolar(d,(i,__,th)=>S*(sin(p*th)*.5+.5)*(.7+.3*this._ampAt(d,i)),{phase:t*.0004,close:true});
        }),
        flower:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.4*cw, pt=6+Math.round(2*abs(cos(t*.00015)));
          this._tracePolar(d,(i,__,th)=>S*(cos(pt*th)*.3+.7)*(.6+.4*this._ampAt(d,i)),{phase:t*.0003,close:true});
        }),
        wave:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.6*cw, n=d.length, fq=3+sin(t*.0002)*2;
          this._traceParam(d,i=>{ const x=i/n*S-S/2, y=sin(x*fq/50+t*.001)*S*.3*this._ampAt(d,i); return [c+x,c+y]; });
        }),
        mandala:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.35*cw;
          this._tracePolar(d,(i,__,th)=>S*(.8+cos(6*th)*.3+sin(12*th)*.2+cos(18*th)*.1)*(.7+.3*this._ampAt(d,i)),{phase:t*.0002,close:true});
        }),
        infinity:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.4*cw;
          this._traceParam(d,(i,n)=>{ const th=theta(i,n,t*.0003), sc=.7+.3*this._ampAt(d,i), den=1+sin(th)*sin(th);
            return [c+S*cos(th)/den*sc, c+S*sin(th)*cos(th)/den*sc];
          });
        }),
        dna:(d,t)=>this._withCtx((ctx,cw,c)=>{ const S=.3*cw, n=d.length, H=cw*.8, helix=ph=>{ ctx.beginPath();
            for(let i=0;i<n;i++){ const z=i/n*4*PI+ph+t*.001, a=.7+.3*this._ampAt(d,i), x=c+cos(z)*S*a, y=c+(i/n-.5)*H; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
            ctx.stroke(); };
          helix(0); helix(PI);
        }),
        tornado:(d,t)=>this._withCtx((_,cw,c)=>{ const S=.4*cw;
          this._traceParam(d,(i,n)=>{ const p=i/n, th=p*TAU*6+t*.0005, r=S*(1-p)*(.6+.4*this._ampAt(d,i)); return [c+cos(th)*r, c+(p-.5)*cw*.7]; });
        }),
      };
    }

    // ---------------- Lifecycle ----------------
    listShapes(){ return Object.keys(this.drawFuncs).filter(k => k!=='hum'); }

    connectedCallback(){
      if (!this._animId) this._animId = requestAnimationFrame(this._animate);
      try { this._ro = new ResizeObserver(this._resizeCanvas); this._ro.observe(this); } catch { this._resizeCanvas(); }
      this._resizeCanvas();
    }

    disconnectedCallback(){
      if (this._animId) cancelAnimationFrame(this._animId), this._animId=null;
      if (this._ro) { try{ this._ro.disconnect(); }catch{} this._ro=null; }
    }

    // ---------------- Layout ----------------
    _resizeCanvas(){
      const { width, height } = this.getBoundingClientRect?.() ?? { width: this._cssW, height: this._cssH };
      const cssW = max(1, width|0), cssH = max(1, height|0), dpr = min(4, max(1, window.devicePixelRatio||1));
      if (cssW===this._cssW && cssH===this._cssH && dpr===this._dpr) return;
      this._cssW=cssW; this._cssH=cssH; this._dpr=dpr;
      const devW = max(1, Math.round(cssW*dpr)), devH = max(1, Math.round(cssH*dpr));
      const cv = this._canvas;
      if (cv.width!==devW) cv.width=devW;
      if (cv.height!==devH) cv.height=devH;
      const ctx = this._ctx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,devW,devH); ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    // ---------------- Data ----------------
    _getSeed(){
      return this.preset?.seed
        ?? this.closest?.('osc-app')?.getAttribute?.('seed')
        ?? document.documentElement?.dataset?.seed
        ?? 'default';
    }

    _makeSeedBuffer(shape, seed, len=2048){
      const str = `${seed}_${shape}`; let a=0; for(let i=0;i<str.length;i++) a=(a<<5)-a+str.charCodeAt(i); let s=a|0;
      const rng = () => { s=(s+0x6D2B79F5)|0; let t=imul(s^(s>>>15),1|s); t=(t+imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
      const out=new Float32Array(len), p=SHAPE_PARAMS[shape]||SHAPE_PARAMS.circle;
      for(let i=0;i<len;i++){ const tt=i/len; let sig=0;
        for(let h=0;h<p.harmonics.length;h++){ const f=p.freq*(h+1); sig+=p.harmonics[h]*sin(TAU*f*tt+rng()*TAU); }
        const mod=p.complexity*(rng()-.5)*.3, env=.5+.5*sin(TAU*tt*.1+rng()*TAU); out[i]=(sig+mod)*env*.7;
      }
      return out;
    }

    _selectData(){
      if (this.isAudioStarted && this.isPlaying && this.analyser){
        const need=this.analyser.fftSize; if (!this._liveBuffer || this._liveBuffer.length!==need) this._liveBuffer=new Float32Array(need);
        this.analyser.getFloatTimeDomainData(this._liveBuffer); return this._liveBuffer;
      }
      if (this.preset && this.mode==='seed'){
        const seed=this.preset?.seed ?? this._getSeed(), key=this.shapeKey||'circle'; (this.preset._seedBuffers ||= {});
        return this.preset._seedBuffers[key] ||= this._makeSeedBuffer(key, seed);
      }
      if (!this._dummyData){ const len=2048, a=new Float32Array(len); for(let i=0;i<len;i++){ const t=i/len; a[i]=.5*sin(TAU*t)+.3*sin(TAU*2*t+PI/3); } this._dummyData=a; }
      return this._dummyData;
    }

    // ---------------- Seeded Look Planning (colors + effects) ----------------
    _prob(attr){ const v = parseFloat(this.getAttribute?.(attr) || ''); const p = Number.isFinite(v) ? v : DEFAULTS.PROB[attr]; return min(1, max(0, p)); }
    _weights(base, attrName){ const w = _jsonAttr(this, attrName, base); return { ...base, ...w }; }

    _getColorWeights(){   return this._weights(DEFAULTS.COLOR_WEIGHTS,   'color-weights'); }
    _getDarkColorWeights(){return this._weights(DEFAULTS.DARK_COLOR_WEIGHTS,'dark-color-weights'); }
    _getNeutralColorWeights(){return this._weights(DEFAULTS.NEUTRAL_COLOR_WEIGHTS,'neutral-color-weights'); }
    _getEffectWeights(){  return this._weights(DEFAULTS.EFFECT_WEIGHTS,  'effect-weights'); }
    _getSpeedWeights(){   return this._weights(DEFAULTS.CYC_SPEED_WEIGHTS,'cycle-speed-weights'); }

    _ensurePlan(){
      const seed = this.preset?.seed ?? this._getSeed();

      const monoProb        = this._prob('mono-prob');
      const halfDomProb     = this._prob('half-dominant-prob');
      const groupStrobeProb = this._prob('group-strobe-prob');
      const darkProb        = this._prob('dark-palette-prob');
      const neutralProb     = this._prob('neutral-palette-prob');

      const colorWeights   = this._getColorWeights();
      const effectWeights  = this._getEffectWeights();
      const speedWeights   = this._getSpeedWeights();
      const darkWeights    = this._getDarkColorWeights();
      const neutralWeights = this._getNeutralColorWeights();

      const p = this._plan;
      const changed = !p
        || p.seed !== seed
        || JSON.stringify(p.colorWeights)   !== JSON.stringify(colorWeights)
        || JSON.stringify(p.effectWeights)  !== JSON.stringify(effectWeights)
        || JSON.stringify(p.speedWeights)   !== JSON.stringify(speedWeights)
        || JSON.stringify(p.darkWeights)    !== JSON.stringify(darkWeights)
        || JSON.stringify(p.neutralWeights) !== JSON.stringify(neutralWeights)
        || p.monoProb !== monoProb || p.halfDomProb !== halfDomProb || p.groupStrobeProb !== groupStrobeProb
        || p.darkProb !== darkProb || p.neutralProb !== neutralProb;

      if (!changed) return;

      // modes
      const rMono = _rngFrom(`${seed}::mode::mono`);
      const isMono = rMono() < monoProb;

      const rNeutral = _rngFrom(`${seed}::mode::neutral`);
      const isNeutralPalette = !isMono && (rNeutral() < neutralProb);

      const rDark = _rngFrom(`${seed}::mode::dark`);
      const isDarkPalette = !isMono && !isNeutralPalette && (rDark() < darkProb);

      const rHalf = _rngFrom(`${seed}::mode::half`);
      const isHalf = !isMono && (rHalf() < halfDomProb);

      const rGroupStrobe = _rngFrom(`${seed}::mode::gStrobe`);
      const isGroupStrobe = rGroupStrobe() < groupStrobeProb;
      const groupStrobeAll = isGroupStrobe && (_rngFrom(`${seed}::mode::gStrobeType`)() < 0.5);

      // active color table
      let activeColorWeights =
        isNeutralPalette ? _onlyKeys(neutralWeights, NEUTRAL_COLOR_KEYS) :
        isDarkPalette    ? _onlyKeys(darkWeights, Object.keys(darkWeights)) :
                           { ...colorWeights };
      if (!Object.keys(activeColorWeights).length) activeColorWeights = { ...colorWeights };

      // mono color
      const colorUniformKey = isMono ? _pickWeightedKey(_rngFrom(`${seed}::monoColorPick`), activeColorWeights) : null;

      // half-dominant
      let halfDominantKey = null, halfDominantSet = new Set();
      if (isHalf) {
        halfDominantKey = _pickWeightedKey(_rngFrom(`${seed}::halfColorPick`), activeColorWeights);
        const shapesAll = Object.keys(this.drawFuncs);
        const target = max(1, Math.round(shapesAll.length * DEFAULTS.HALF_DOMINANT_RATIO));
        halfDominantSet = new Set(_chooseSubset(_rngFrom(`${seed}::halfSubset`), shapesAll, target));
      }

      // per-shape assignments
      const perShapeColorKey = {};
      const perShapeCyclerSpeedKey = {};
      const perShapeEffectKey = {};
      const shapes = Object.keys(this.drawFuncs);

      for (const k of shapes) {
        // color
        const key = isMono ? colorUniformKey
          : (isHalf && halfDominantSet.has(k)) ? halfDominantKey
          : _pickWeightedKey(_rngFrom(`${seed}::color::${k}`), activeColorWeights);
        perShapeColorKey[k] = key;

        // cycler speed
        if (key === 'cycler') {
          perShapeCyclerSpeedKey[k] = _pickWeightedKey(_rngFrom(`${seed}::speed::${k}`), speedWeights);
        }

        // effects (allow overrides)
        const rEff = _rngFrom(`${seed}::effect::${k}`);
        perShapeEffectKey[k] = _pickWeightedKey(rEff, DEFAULTS.EFFECT_WEIGHTS) ?? 'none';
        const effOverride = _pickWeightedKey(rEff, effectWeights);
        if (effOverride) perShapeEffectKey[k] = effOverride;
      }

      // optional group strobe override
      let groupStrobeSet = new Set();
      if (isGroupStrobe) {
        if (groupStrobeAll) {
          groupStrobeSet = new Set(shapes);
        } else {
          const frac = 0.5 + 0.5 * _rngFrom(`${seed}::gStrobe::size`)(); // 50..100%
          const count = max(1, Math.round(shapes.length * frac));
          groupStrobeSet = new Set(_chooseSubset(_rngFrom(`${seed}::gStrobe::subset`), shapes, count));
        }
        for (const k of groupStrobeSet) perShapeEffectKey[k] = 'strobe';
      }

      this._plan = {
        seed,
        monoProb, halfDomProb, groupStrobeProb, darkProb, neutralProb,
        isMono, isHalf, isDarkPalette, isNeutralPalette,
        colorUniformKey,
        halfDominantKey, halfDominantSet,
        colorWeights, effectWeights, speedWeights,
        darkWeights, neutralWeights,
        perShapeColorKey, perShapeCyclerSpeedKey, perShapeEffectKey,
        isGroupStrobe, groupStrobeAll, groupStrobeSet
      };
    }

    _getColorFor(shapeKey, now){
      this._ensurePlan();
      const key = this._plan.perShapeColorKey[shapeKey] || 'bitcoin_orange';
      if (key === 'cycler') {
        const spdKey = this._plan.perShapeCyclerSpeedKey[shapeKey] || 'medium';
        const speed = DEFAULTS.CYCLER_SPEEDS[spdKey] ?? DEFAULTS.CYCLER_SPEEDS.medium;
        const hue = (now * speed) % 360;
        return { css: `hsl(${hue},85%,60%)`, key, speedKey: spdKey };
      }
      return { css: DEFAULTS.NAMED_COLORS[key] || '#FFFFFF', key, speedKey: null };
    }

    _getEffectFor(shapeKey){
      this._ensurePlan();
      return this._plan.perShapeEffectKey[shapeKey] || 'none';
    }

    // ---------------- Animation ----------------
    _animate(){
      const now=performance.now();
      this._resizeCanvas();
      const data=this._selectData();

      const { css } = this._getColorFor(this.shapeKey, now);
      const effect = this._getEffectFor(this.shapeKey);
      this._prepareStroke(css, { effect, now });

      (this.drawFuncs[this.shapeKey] || this.drawFuncs.circle)(data, now, this.preset ?? {});

      if (typeof this.onIndicatorUpdate==='function'){
        const started=this.isAudioStarted, active=started && this.isPlaying;
        // this.onIndicatorUpdate(started ? (active?'Audio Live':'Muted') : 'Silent Mode', !!active);
      }
      this._animId = requestAnimationFrame(this._animate);
    }
  }

  customElements.define('scope-canvas', ScopeCanvas);
})();