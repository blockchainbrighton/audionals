/* ScopeCanvas – Oscilloscope Visual Renderer (public API unchanged) */
(() => {
  const { sin, cos, abs, PI, pow, SQRT2, imul } = Math;
  const TAU = PI * 2, theta = (i, n, ph = 0) => (i / n) * TAU + ph, norm = v => (v + 1) * 0.5;

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
        const c = Math.min(cx, cy) / (this._dpr || 1);
        return fn(this._ctx, cw, c);
      };

      this._traceParam = (data, map, {close=false}={}) => this._withCtx((ctx, cw, c) => {
        ctx.beginPath();
        for (let i=0,n=data.length;i<n;i++){ const [x,y]=map(i,n,cw,c); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
        close && ctx.closePath(); ctx.stroke();
      });

      this._tracePolar = (data, rFn, {phase=0, close=false}={}) =>
        this._traceParam(data,(i,n,cw,c)=>{ const th=theta(i,n,phase), r=rFn(i,n,th,cw,c); return [c+cos(th)*r, c+sin(th)*r]; },{close});

      this._prepareStroke = hue => { const { _ctx:ctx } = this;
        ctx.clearRect(0,0,this._cssW,this._cssH); ctx.strokeStyle=`hsl(${hue},85%,60%)`;
        ctx.lineWidth=2; ctx.lineJoin=ctx.lineCap='round';
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
          ctx.strokeStyle='hsl(195, 80%, 62%)'; ctx.globalAlpha=.36;
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
          this._traceParam(d,(i,n)=>{ const th=i/n*TAU*8+t*.0003, r=S*(i/n)*(.6+.4*this._ampAt(d,i)); return [c+cos(th)*r,c+sin(th)*r]; });
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

    _resizeCanvas(){
      const { width, height } = this.getBoundingClientRect();
      const cssW = Math.max(1, width|0), cssH = Math.max(1, height|0), dpr = Math.min(4, Math.max(1, window.devicePixelRatio||1));
      if (cssW===this._cssW && cssH===this._cssH && dpr===this._dpr) return;
      this._cssW=cssW; this._cssH=cssH; this._dpr=dpr;
      const devW = Math.max(1, Math.round(cssW*dpr)), devH = Math.max(1, Math.round(cssH*dpr));
      const cv = this._canvas; (cv.width!==devW) && (cv.width=devW); (cv.height!==devH) && (cv.height=devH);
      const ctx = this._ctx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,devW,devH); ctx.setTransform(dpr,0,0,dpr,0,0);
    }

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

    _animate(){
      const now=performance.now(); this._resizeCanvas();
      const data=this._selectData(), hue=(now*(this.preset?.colorSpeed ?? .06))%360;
      this._prepareStroke(hue); (this.drawFuncs[this.shapeKey]||this.drawFuncs.circle)(data, now, this.preset ?? {});
      if (typeof this.onIndicatorUpdate==='function'){ const started=this.isAudioStarted, active=started && this.isPlaying;
        // this.onIndicatorUpdate(started ? (active?'Audio Live':'Muted') : 'Silent Mode', !!active);
      }
      this._animId = requestAnimationFrame(this._animate);
    }
  }

  customElements.define('scope-canvas', ScopeCanvas);
})();
