// js/hk-icons.js
// On-screen round badges for the most useful hotkeys.
// Includes C (controls) and Q (sequencer).

(() => {
  const BADGES = [
    ['o','O','hk-toggle-power',      null,  -90],
    ['m','M','hk-toggle-mute',       null,  -45],
    ['c','C','hk-toggle-controls',   null,  -15], // controls
    ['q','Q','hk-toggle-sequencer',  null,   10], // sequencer
    ['p','P','hk-toggle-seq-play',   null,   35],
    ['s','s','hk-audio-signature',   null,   90],
    ['S','S','hk-toggle-signature',  null,  135],
    ['l','l','hk-toggle-loop',       null,  180],
    ['L','L','hk-toggle-latch',      null, -135],
  ];

  const STYLE = `
    .hk-ring{position:absolute;inset:0;pointer-events:none;z-index:40}
    .hk-badge{
      position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;
      display:flex;align-items:center;justify-content:center;
      font:700 14px/1 "Courier New",monospace;color:#fff;background:#000;
      border:1px solid #999;border-radius:999px;box-shadow:0 0 0 1px #000,0 0 10px #0008;
      pointer-events:auto;user-select:none;cursor:pointer;letter-spacing:.02em;
      transition:transform .08s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease;
      transform:translate(-50%,-50%) rotate(var(--ang,0deg)) translateX(56px);
      touch-action:manipulation;
    }
    .hk-badge:hover{background:#101010;border-color:#bcd;box-shadow:0 0 0 1px #000,0 0 12px #223a}
    .hk-badge:active{transform:translate(-50%,-50%) rotate(var(--ang,0deg)) translateX(var(--r,56px)) scale(.96)}
    .hk-badge[data-shift="1"]{border-color:#7aa2ff}
  `;

  const ready = (fn) => (document.readyState !== 'loading'
    ? fn()
    : document.addEventListener('DOMContentLoaded', fn));

  ready(() => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    const waitFor = (pred, ms=6000) => new Promise(r=>{
      const t0=performance.now(); (function tick(){ if(pred()) return r(true);
        if(performance.now()-t0>ms) return r(false); requestAnimationFrame(tick); })();
    });

    (async () => {
      const ok = await waitFor(() =>
        app.shadowRoot &&
        app.shadowRoot.querySelector('#canvasContainer') &&
        app.shadowRoot.querySelector('osc-hotkeys')
      );
      if (!ok) return;

      const sr = app.shadowRoot;
      const canvasContainer = sr.querySelector('#canvasContainer');
      const hotkeysEl = sr.querySelector('osc-hotkeys');
      if (getComputedStyle(canvasContainer).position === 'static')
        canvasContainer.style.position = 'relative';

      const ring = document.createElement('div');
      ring.className = 'hk-ring';
      ring.appendChild(Object.assign(document.createElement('style'),{textContent:STYLE}));

      const make = (label, ang, type, detail) => {
        const el = document.createElement('div');
        el.className='hk-badge'; el.textContent=label;
        if(label==='S'||label==='L') el.dataset.shift='1';
        el.style.setProperty('--ang',`${ang}deg`);
        el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
          hotkeysEl.dispatchEvent(new CustomEvent(type,{detail,bubbles:true,composed:true}));
        },{passive:false});
        return el;
      };

      const frag = document.createDocumentFragment();
      for (const [, label, type, detail, ang] of BADGES) frag.appendChild(make(label, ang, type, detail));
      ring.appendChild(frag);
      canvasContainer.appendChild(ring);

      // Clamp badges so they stay on-screen (phones/notches)
      const getSafe = () => {
        const d=document.createElement('div');
        d.style.cssText='position:fixed;inset:auto 0 0 0;height:0;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0);visibility:hidden';
        document.body.appendChild(d);
        const cs=getComputedStyle(d);
        const s={top:parseFloat(cs.paddingTop)||0,right:parseFloat(cs.paddingRight)||0,bottom:parseFloat(cs.paddingBottom)||0,left:parseFloat(cs.paddingLeft)||0};
        d.remove(); return s;
      };

      const adjust = () => {
        const rect=canvasContainer.getBoundingClientRect();
        const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
        const vw=innerWidth, vh=innerHeight, inset=getSafe();
        const PAD=10, SZ=30, HALF=SZ/2, OUT=22;
        const baseR=(Math.min(rect.width,rect.height)/2)+OUT;

        const controls = sr.querySelector('osc-controls');
        const cr = (controls && controls.offsetParent!==null) ? controls.getBoundingClientRect() : null;

        const minX=inset.left + PAD + HALF;
        const maxX=vw - inset.right - PAD - HALF;
        const minY=inset.top + PAD + HALF;
        const capBottom = cr ? (cr.top - PAD - HALF) : (vh - inset.bottom - PAD - HALF);
        const maxY=Math.max(minY, capBottom);

        ring.querySelectorAll('.hk-badge').forEach(el=>{
          const ang=parseFloat(el.style.getPropertyValue('--ang'))||0;
          const rad=ang*Math.PI/180, ux=Math.cos(rad), uy=Math.sin(rad);
          let r=baseR;
          if(ux>0) r=Math.min(r,(maxX-cx)/ux);
          if(ux<0) r=Math.min(r,(cx-minX)/-ux);
          if(uy>0) r=Math.min(r,(maxY-cy)/uy);
          if(uy<0) r=Math.min(r,(cy-minY)/-uy);
          r=Math.max(HALF+4,Math.floor(r));
          el.style.transform=`translate(-50%,-50%) rotate(${ang}deg) translateX(${r}px)`;
        });
      };

      adjust();
      addEventListener('resize', adjust, { passive:true });
      const controls = sr.querySelector('osc-controls');
      if (controls) { try { new ResizeObserver(adjust).observe(controls); } catch {} }
    })();
  });
})();
