/* ScopeCanvas – Oscilloscope Visual Renderer (public API unchanged) */
(() => {
  const { sin, cos, abs, PI, pow, SQRT2, imul, min, max } = Math;
  const TAU = PI * 2, theta = (i, n, ph = 0) => (i / n) * TAU + ph, norm = v => (v + 1) * 0.5;

  // --- Seeded color/effect config + helpers ---------------------------------
  const DEFAULT_MONOCHROME_PROB     = 0.02; // ~1 in 50 → all shapes same color
  const DEFAULT_HALF_DOMINANT_PROB  = 0.05; // ~1 in 20 → ~half shapes share one color
  const DEFAULT_GROUP_STROBE_PROB   = 0.01; // ~1 in 20 → many/all shapes strobe
  const DEFAULT_DARK_PALETTE_PROB   = 0.01; // sometimes bias palette to darker colors
  const DEFAULT_NEUTRAL_PALETTE_PROB= 0.05; // sometimes bias palette to neutrals (mono-ish but multicolor)

  const HALF_DOMINANT_RATIO = 0.5;          // target fraction for half-dominant mode

  // Hue-cycler speed options (hue per ms). Order: slow, medium (~original), fast, lightning
  const CYCLER_SPEEDS = { slow:0.03, medium:0.06, fast:0.12, lightning:0.6 };

  // Base weights (can override via element attributes)
  // Keep bright/brand palette here; dark/neutral variants are managed in the special-mode tables below.
  const COLOR_WEIGHTS_DEFAULT = {
    // brand / requested hues (bright set)
    bitcoin_orange: 3,
    stacks_purple:  2,   // keep, but darker variant lives in dark palette
    deep_purple:    2,
    light_magenta:  3,
    shocking_pink:  4,
    royal_blue:    10,   // extra for variety
    dark_green:   3,


    // common heroes
    bright_pink:    6,
    bright_red:     12,

    // supporting reds
    dark_red:       6,

    // vivid accents tuned for dark bg
    bright_yellow:  1,
    gold:           1,

    // neutrals (bright/standard)
    white:          3,

    // subtle baseline options
    dark_gray:      2,
    near_black:     1,

    // special
    cycler:         3
  };

  // Optional special-mode overrides (only keys listed are used in that mode)
  // Strongly dark-biased palette: truly dark tones across several hues
  const DARK_COLOR_WEIGHTS_DEFAULT = {
    // very dark hues
    extra_dark_purple:  2,
    very_dark_blue:     2,
    very_dark_green:    3,
    dark_red:           5,

    // very dark neutrals
    extra_dark_gray:    3,
    charcoal:           2,
    near_black:         1,

    // tiny chance of a metallic pop
    gold:               1
    // (no cycler here by default; add "cycler": N via attribute to allow it)
  };

  // Neutral/monochrome-biased palette with more stops between black and white
  const NEUTRAL_COLOR_WEIGHTS_DEFAULT = {
    near_black:      4,
    extra_dark_gray: 5,
    charcoal:        5,
    dark_gray:       5,
    slate_gray:      4,
    dim_gray:        4,
    silver:          3,
    gainsboro:       3,
    off_white:       4,
    white:           3
    // (no cycler here by default)
  };

  const EFFECT_WEIGHTS_DEFAULT = {
    none:   60,
    glow:   25,  // soft glow (shadow)
    strobe: 10,  // flashes alpha
    neon:   5    // stronger glow + additive composite
  };

  const CYC_SPEED_WEIGHTS_DEFAULT = {
    slow: 25, medium: 40, fast: 25, lightning: 10
  };

  // Named color registry — ensure every key used above is defined here.
  const NAMED_COLORS = {
    // brand / requested hues (bright set)
    bitcoin_orange:    '#F7931A',
    stacks_purple:     '#5546FF', // bright; dark variant below for dark palette
    deep_purple:       '#4B1EFF',
    light_magenta:     '#FF4FD8',
    shocking_pink:     '#FF00A8',
    bright_pink:       '#FF1493',
    bright_red:        '#FF1A1A',
    dark_red:          '#6A0000',
    royal_blue:        '#0726a2ff',
    dark_green:      '#017210ff',


    // vivid accents
    bright_yellow:     '#FFD400',
    gold:              '#FFD700',

    // neutrals (baseline)
    white:             '#FFFFFF',
    dark_gray:         'rgba(16,16,24,0.40)',
    near_black:        '#0A0A10',

    // --- new very-dark hues for the dark palette ---
    stacks_purple_dark:'#241E72', // deepened Stacks tone (less luminous)
    extra_dark_purple: '#1C0033', // near-black purple
    very_dark_blue:    '#0B1E3A', // midnight/navy blue
    very_dark_green:   '#012B1B', // deep teal/green

    // --- additional neutral stops for the neutral palette ---
    extra_dark_gray:   '#0F1014', // darker than dark_gray, still RGB hex for crisp edges
    charcoal:          '#14161C',
    slate_gray:        '#2A2F3A',
    dim_gray:          '#6E6E73',
    silver:            '#C0C0C8',
    gainsboro:         '#DDDEE3'
  };



  // Palettes for special modes
  const DARK_COLOR_KEYS    = Object.keys(DARK_COLOR_WEIGHTS_DEFAULT);
  const NEUTRAL_COLOR_KEYS = Object.keys(NEUTRAL_COLOR_WEIGHTS_DEFAULT);

  const _hash32 = (str) => { let a = 0; for (let i=0;i<str.length;i++) a = (a<<5) - a + str.charCodeAt(i); return a|0; };
  const _rngFrom = (str) => {
    let s = _hash32(str);
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = imul(s ^ (s>>>15), 1|s);
      t = (t + imul(t ^ (t>>>7), 61|t)) ^ t;
      return ((t ^ (t>>>14)) >>> 0) / 4294967296; // [0,1)
    };
  };

  const _parseJSONAttr = (el, name, fallback) => {
    try {
      const raw = el?.getAttribute?.(name);
      if (!raw) return fallback;
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : fallback;
    } catch { return fallback; }
  };

  const _pickWeightedKey = (rand, weightsObj) => {
    const keys = Object.keys(weightsObj);
    let sum = 0; for (const k of keys) sum += max(0, +weightsObj[k] || 0);
    if (sum <= 0) return keys[0] || null;
    let r = rand() * sum;
    for (const k of keys) { r -= max(0, +weightsObj[k] || 0); if (r <= 0) return k; }
    return keys[keys.length - 1];
  };

  const _filterWeightsToKeys = (weights, allowedKeys) => {
    const out = {};
    for (const k of allowedKeys) if (k in weights) out[k] = weights[k];
    return out;
  };

  const _chooseSubset = (rand, items, k) => {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, k);
  };

  // --- Shape synthesis params ------------------------------------------------
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
      this._canvas = document.createElement('canvas'); sh.append(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this.analyser = null;
      this.preset = null;
      this.shapeKey = 'circle';
      this.mode = 'seed';
      this.isAudioStarted = false;
      this.isPlaying = false;
      this.onIndicatorUpdate = null;

      // Seeded look planning state
      // plan: {
      //   seed, monoProb, halfDomProb, groupStrobeProb, darkProb, neutralProb,
      //   isMono, isHalf, isDarkPalette, isNeutralPalette,
      //   colorUniformKey?, halfDominantKey?, halfDominantSet (Set),
      //   colorWeights, effectWeights, speedWeights, darkWeights, neutralWeights,
      //   perShapeColorKey, perShapeCyclerSpeedKey, perShapeEffectKey,
      //   isGroupStrobe, groupStrobeAll, groupStrobeSet (Set)
      // }
      this._plan = null;

      this._dummyData = null; this._liveBuffer = null; this._animId = null;
      this._cssW = 0; this._cssH = 0; this._dpr = 1;
      this._animate = this._animate.bind(this);
      this._resizeCanvas = this._resizeCanvas.bind(this);

      this._samp = (a,i) => (a ? a[i % a.length] ?? 0 : 0);
      this._ampAt = (a,i) => norm(this._samp(a,i));
      this._avgAbs = a => { let s=0; for (let i=0;i<a.length;i++) s+=abs(a[i]); return s/a.length; };

      this._withCtx = fn => {
        const cw = this._cssW || this._canvas.clientWidth || this._canvas.width;
        const cx = Math.round(this._canvas.width/2), cy = Math.round(this._canvas.height/2);
        const c = min(cx, cy) / (this._dpr || 1);
        return fn(this._ctx, cw, c);
      };

      this._traceParam = (data, map, {close=false}={}) => this._withCtx((ctx, cw, c) => {
        ctx.beginPath();
        for (let i=0,n=data.length;i<n;i++){ const [x,y]=map(i,n,cw,c); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
        close && ctx.closePath(); ctx.stroke();
      });

      this._tracePolar = (data, rFn, {phase=0, close=false}={}) =>
        this._traceParam(data,(i,n,cw,c)=>{ const th=theta(i,n,phase), r=rFn(i,n,th,cw,c); return [c+cos(th)*r, c+sin(th)*r]; },{close});

      // Accept CSS color + effect params
      this._prepareStroke = (cssColor, { effect='none', now=0 } = {}) => {
        const ctx = this._ctx;
        ctx.clearRect(0,0,this._cssW,this._cssH);
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.lineJoin = ctx.lineCap = 'round';

        // Effects (minimal code, visible impact)
        if (effect === 'glow') {
          ctx.shadowBlur = 16; ctx.shadowColor = cssColor;
        } else if (effect === 'neon') {
          ctx.shadowBlur = 28; ctx.shadowColor = cssColor;
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineWidth = 2.6;
        } else if (effect === 'strobe') {
          // flash ~8-12 Hz with a bit of jitter
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
          // first stroke uses current strokeStyle (seeded)
          ctx.save(); ctx.globalAlpha=.23+.14*abs(sin(t*.0004));
          ctx.beginPath(); ctx.arc(c,c,R,0,TAU); ctx.stroke();

          // secondary accent: if mono-day (or half-dom color applied), reuse seeded; otherwise cyan accent
          const mono = !!(this._plan && this._plan.isMono);
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
          this._traceParam(
            d,
            (i,n,cw,c) => {
              const th = i/n*PI*28 + t*.00035;
              const a = pow(this._ampAt(d,i), 1.25);
              const s = Math.exp(.85*cos(th)) - 1.6*cos(5*th) + pow(sin(th/10), 7);
              const r = s * .22 * cw * (.5 + .5*a);
              return [c + sin(th)*r, c + cos(th)*r];
            },
            { close:true }
          )
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
      this._animId || (this._animId = requestAnimationFrame(this._animate));
      try { this._ro = new ResizeObserver(this._resizeCanvas); this._ro.observe(this); } catch { this._resizeCanvas(); }
      this._resizeCanvas();
    }

    disconnectedCallback(){
      this._animId && (cancelAnimationFrame(this._animId), this._animId=null);
      if (this._ro) { try{ this._ro.disconnect(); }catch{} this._ro=null; }
    }

    // ---------------- Layout ----------------
    _resizeCanvas(){
      const { width, height } = this.getBoundingClientRect();
      const cssW = max(1, width|0), cssH = max(1, height|0), dpr = min(4, max(1, window.devicePixelRatio||1));
      if (cssW===this._cssW && cssH===this._cssH && dpr===this._dpr) return;
      this._cssW=cssW; this._cssH=cssH; this._dpr=dpr;
      const devW = max(1, Math.round(cssW*dpr)), devH = max(1, Math.round(cssH*dpr));
      const cv = this._canvas; (cv.width!==devW) && (cv.width=devW); (cv.height!==devH) && (cv.height=devH);
      const ctx = this._ctx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,devW,devH); ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    // ---------------- Data ----------------
    _getSeed(){
      return this.preset?.seed ?? this.closest?.('osc-app')?.getAttribute?.('seed') ?? document.documentElement?.dataset?.seed ?? 'default';
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
        const need=this.analyser.fftSize; (!this._liveBuffer || this._liveBuffer.length!==need) && (this._liveBuffer=new Float32Array(need));
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
    _getMonoProb(){
      const pAttr = parseFloat(this.getAttribute?.('mono-prob') || '');
      const p = Number.isFinite(pAttr) ? pAttr : DEFAULT_MONOCHROME_PROB;
      return min(1, max(0, p));
    }
    _getHalfDomProb(){
      const pAttr = parseFloat(this.getAttribute?.('half-dominant-prob') || '');
      const p = Number.isFinite(pAttr) ? pAttr : DEFAULT_HALF_DOMINANT_PROB;
      return min(1, max(0, p));
    }
    _getGroupStrobeProb(){
      const pAttr = parseFloat(this.getAttribute?.('group-strobe-prob') || '');
      const p = Number.isFinite(pAttr) ? pAttr : DEFAULT_GROUP_STROBE_PROB;
      return min(1, max(0, p));
    }
    _getDarkPaletteProb(){
      const pAttr = parseFloat(this.getAttribute?.('dark-palette-prob') || '');
      const p = Number.isFinite(pAttr) ? pAttr : DEFAULT_DARK_PALETTE_PROB;
      return min(1, max(0, p));
    }
    _getNeutralPaletteProb(){
      const pAttr = parseFloat(this.getAttribute?.('neutral-palette-prob') || '');
      const p = Number.isFinite(pAttr) ? pAttr : DEFAULT_NEUTRAL_PALETTE_PROB;
      return min(1, max(0, p));
    }

    _getColorWeights(){
      const w = _parseJSONAttr(this, 'color-weights', COLOR_WEIGHTS_DEFAULT);
      return { ...COLOR_WEIGHTS_DEFAULT, ...w };
    }
    _getDarkColorWeights(){
      const w = _parseJSONAttr(this, 'dark-color-weights', DARK_COLOR_WEIGHTS_DEFAULT);
      return { ...DARK_COLOR_WEIGHTS_DEFAULT, ...w };
    }
    _getNeutralColorWeights(){
      const w = _parseJSONAttr(this, 'neutral-color-weights', NEUTRAL_COLOR_WEIGHTS_DEFAULT);
      return { ...NEUTRAL_COLOR_WEIGHTS_DEFAULT, ...w };
    }
    _getEffectWeights(){
      const w = _parseJSONAttr(this, 'effect-weights', EFFECT_WEIGHTS_DEFAULT);
      return { ...EFFECT_WEIGHTS_DEFAULT, ...w };
    }
    _getSpeedWeights(){
      const w = _parseJSONAttr(this, 'cycle-speed-weights', CYC_SPEED_WEIGHTS_DEFAULT);
      return { ...CYC_SPEED_WEIGHTS_DEFAULT, ...w };
    }

    _ensurePlan(){
      const seed = this.preset?.seed ?? this._getSeed();

      const monoProb        = this._getMonoProb();
      const halfDomProb     = this._getHalfDomProb();
      const groupStrobeProb = this._getGroupStrobeProb();
      const darkProb        = this._getDarkPaletteProb();
      const neutralProb     = this._getNeutralPaletteProb();

      const colorWeights    = this._getColorWeights();
      const effectWeights   = this._getEffectWeights();
      const speedWeights    = this._getSpeedWeights();

      const darkWeights     = this._getDarkColorWeights();
      const neutralWeights  = this._getNeutralColorWeights();

      const stale =
        !this._plan ||
        this._plan.seed !== seed ||
        JSON.stringify(this._plan.colorWeights)   !== JSON.stringify(colorWeights)  ||
        JSON.stringify(this._plan.effectWeights)  !== JSON.stringify(effectWeights) ||
        JSON.stringify(this._plan.speedWeights)   !== JSON.stringify(speedWeights)  ||
        JSON.stringify(this._plan.darkWeights)    !== JSON.stringify(darkWeights)   ||
        JSON.stringify(this._plan.neutralWeights) !== JSON.stringify(neutralWeights)||
        this._plan.monoProb        !== monoProb        ||
        this._plan.halfDomProb     !== halfDomProb     ||
        this._plan.groupStrobeProb !== groupStrobeProb ||
        this._plan.darkProb        !== darkProb        ||
        this._plan.neutralProb     !== neutralProb;

      if (!stale) return;

      // Mode picks
      const rMono = _rngFrom(`${seed}::mode::mono`);
      const isMono = rMono() < monoProb;

      const rNeutral = _rngFrom(`${seed}::mode::neutral`);
      const isNeutralPalette = !isMono && (rNeutral() < neutralProb);

      const rDark = _rngFrom(`${seed}::mode::dark`);
      const isDarkPalette = !isMono && !isNeutralPalette && (rDark() < darkProb);

      const rHalf = _rngFrom(`${seed}::mode::half`);
      const isHalf = !isMono && (rHalf() < halfDomProb); // mono takes precedence

      const rGroupStrobe = _rngFrom(`${seed}::mode::gStrobe`);
      const isGroupStrobe = rGroupStrobe() < groupStrobeProb;
      const rGroupMode = _rngFrom(`${seed}::mode::gStrobeType`);
      const groupStrobeAll = isGroupStrobe && (rGroupMode() < 0.5); // 50% chance all vs subset

      // Choose which weight table is active for colors
      let activeColorWeights;
      if (isNeutralPalette) {
        // restrict to neutral keys only
        activeColorWeights = _filterWeightsToKeys(neutralWeights, NEUTRAL_COLOR_KEYS);
      } else if (isDarkPalette) {
        // restrict to dark palette (plus any extra keys you add to dark-color-weights)
        activeColorWeights = _filterWeightsToKeys(darkWeights, Object.keys(darkWeights));
      } else {
        activeColorWeights = { ...colorWeights };
      }
      // safety: if filtered result is empty, fall back to base
      if (!Object.keys(activeColorWeights).length) activeColorWeights = { ...colorWeights };

      // Mono-day color (picked from the active palette)
      let colorUniformKey = null;
      if (isMono) {
        const rUniform = _rngFrom(`${seed}::monoColorPick`);
        colorUniformKey = _pickWeightedKey(rUniform, activeColorWeights);
      }

      // Half-dominant planning (also uses the active palette)
      let halfDominantKey = null;
      let halfDominantSet = new Set();
      if (isHalf) {
        const rHalfKey = _rngFrom(`${seed}::halfColorPick`);
        halfDominantKey = _pickWeightedKey(rHalfKey, activeColorWeights);

        const shapesAll = Object.keys(this.drawFuncs); // includes 'hum'
        const targetCount = Math.max(1, Math.round(shapesAll.length * HALF_DOMINANT_RATIO));
        const subset = _chooseSubset(_rngFrom(`${seed}::halfSubset`), shapesAll, targetCount);
        halfDominantSet = new Set(subset);
      }

      // Per-shape assignments
      const perShapeColorKey = {};
      const perShapeCyclerSpeedKey = {};
      const perShapeEffectKey = {};

      const shapes = Object.keys(this.drawFuncs); // include 'hum'
      for (const k of shapes) {
        // Color decision
        let key;
        if (isMono) {
          key = colorUniformKey;
        } else if (isHalf && halfDominantSet.has(k)) {
          key = halfDominantKey;
        } else {
          const rColor = _rngFrom(`${seed}::color::${k}`);
          key = _pickWeightedKey(rColor, activeColorWeights);
        }
        perShapeColorKey[k] = key;

        // Cycler speed if needed
        if (key === 'cycler') {
          const rSpd = _rngFrom(`${seed}::speed::${k}`);
          perShapeCyclerSpeedKey[k] = _pickWeightedKey(rSpd, speedWeights);
        }

        // Effects (base)
        const rEff = _rngFrom(`${seed}::effect::${k}`);
        perShapeEffectKey[k] = _pickWeightedKey(rEff, EFFECT_WEIGHTS_DEFAULT);
        // allow overriding via attribute weights too
        const effOverride = _pickWeightedKey(rEff, this._getEffectWeights());
        if (effOverride) perShapeEffectKey[k] = effOverride;
      }

      // Group strobe override
      let groupStrobeSet = new Set();
      if (isGroupStrobe) {
        if (groupStrobeAll) {
          groupStrobeSet = new Set(shapes);
        } else {
          // subset size between 50% and 100% (seeded)
          const rSize = _rngFrom(`${seed}::gStrobe::size`);
          const frac = 0.5 + 0.5 * rSize(); // 0.5..1.0
          const count = Math.max(1, Math.round(shapes.length * frac));
          const pick = _chooseSubset(_rngFrom(`${seed}::gStrobe::subset`), shapes, count);
          groupStrobeSet = new Set(pick);
        }
        // apply override
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
        perShapeColorKey,
        perShapeCyclerSpeedKey,
        perShapeEffectKey,
        isGroupStrobe, groupStrobeAll, groupStrobeSet
      };
    }

    _getColorFor(shapeKey, now){
      this._ensurePlan();
      const plan = this._plan;
      const key = plan.perShapeColorKey[shapeKey] || 'bitcoin_orange';

      if (key === 'cycler') {
        const spdKey = plan.perShapeCyclerSpeedKey[shapeKey] || 'medium';
        const speed = CYCLER_SPEEDS[spdKey] || CYCLER_SPEEDS.medium;
        const hue = (now * speed) % 360;
        return { css: `hsl(${hue},85%,60%)`, key, speedKey: spdKey };
      }
      const css = NAMED_COLORS[key] || '#FFFFFF';
      return { css, key, speedKey: null };
    }

    _getEffectFor(shapeKey){
      this._ensurePlan();
      return this._plan.perShapeEffectKey[shapeKey] || 'none';
    }

    // ---------------- Animation ----------------
    _animate(){
      const now=performance.now(); this._resizeCanvas();
      const data=this._selectData();

      const { css:strokeCSS } = this._getColorFor(this.shapeKey, now);
      const effect = this._getEffectFor(this.shapeKey);
      this._prepareStroke(strokeCSS, { effect, now });

      (this.drawFuncs[this.shapeKey]||this.drawFuncs.circle)(data, now, this.preset ?? {});

      if (typeof this.onIndicatorUpdate==='function'){ const started=this.isAudioStarted, active=started && this.isPlaying;
        // this.onIndicatorUpdate(started ? (active?'Audio Live':'Muted') : 'Silent Mode', !!active);
      }
      this._animId = requestAnimationFrame(this._animate);
    }
  }

  customElements.define('scope-canvas', ScopeCanvas);
})();
