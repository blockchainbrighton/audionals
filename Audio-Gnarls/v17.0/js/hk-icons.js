// js/hk-icons.js
// On-screen round badges for the most useful hotkeys.
// Implements tooltips, active states, and edge-snapped positioning.

(() => {
  // --- Data for each badge ---
  // Structure: [hotkey, label, eventType, eventDetail, angle, tooltipTitle, uniqueId]
  const BADGES = [
    ['o','O','hk-toggle-power',      null,  -90, 'Power',          'power'],
    ['m','M','hk-toggle-mute',       null,  -45, 'Mute',           'mute'],
    ['c','C','hk-toggle-controls',   null,  -15, 'Controls',       'controls'],
    ['q','Q','hk-toggle-sequencer',  null,   10, 'Sequencer',      'sequencer'],
    ['p','P','hk-toggle-seq-play',   null,   35, 'Play/Pause',     'seq-play'],
    ['s','s','hk-audio-signature',   null,   90, 'Signature',      'signature'],
    ['S','S','hk-toggle-signature',  null,  135, 'Signature Mode', 'sig-mode'],
    ['l','l','hk-toggle-loop',       null,  180, 'Loop',           'loop'],
    ['L','L','hk-toggle-latch',      null, -135, 'Latch',          'latch'],
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

    /* --- Active State Styles --- */
    .hk-badge.is-power[data-active="true"] {
      background:#c12231; color:#fff; border-color:#ff4e6a;
      box-shadow:0 0 16px 3px #ff2a3999, 0 0 4px #ff7484cc;
      text-shadow: 0 0 5px #fff;
    }
    .hk-badge.is-mute[data-active="true"] {
      background:#a51427; color:#fff; border-color:#ff506e;
      box-shadow: 0 0 10px #ff506e66;
    }
    .hk-badge[data-active="true"] {
      background:#1f3a26; color:#9df5c2; border-color:#46ad6d;
      box-shadow: 0 0 8px #46ad6d55;
    }
    .hk-badge[data-id="sig-mode"][data-active="true"] {
        background: #1f2a3f; border-color: #7aa2ff; color: #cfe0ff;
        box-shadow: 0 0 12px #7aa2ff55;
    }

    /* --- Custom Tooltip Styles --- */
    .hk-tooltip{
      position:absolute; top:0; left:0;
      background: #111; color: #eee; border: 1px solid #889;
      padding: 4px 8px; border-radius: 4px; font-size: 13px; font-family: sans-serif;
      z-index: 50;
      opacity: 0;
      transform: translate(-50%, -100%);
      transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
      pointer-events: none;
      white-space: nowrap;
    }
  `;

  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn));

  ready(() => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    const waitFor = (pred, ms=6000) => new Promise(r=>{
      const t0=performance.now(); (function tick(){ if(pred()) return r(true);
        if(performance.now()-t0>ms) return r(false); requestAnimationFrame(tick); })();
    });

    (async () => {
      const ok = await waitFor(() => app.shadowRoot?.querySelector('#canvasContainer') && app.shadowRoot?.querySelector('osc-hotkeys'));
      if (!ok) return;

      const sr = app.shadowRoot;
      const canvasContainer = sr.querySelector('#canvasContainer');
      const hotkeysEl = sr.querySelector('osc-hotkeys');
      if (getComputedStyle(canvasContainer).position === 'static')
        canvasContainer.style.position = 'relative';

      const ring = document.createElement('div');
      ring.className = 'hk-ring';
      ring.appendChild(Object.assign(document.createElement('style'),{textContent:STYLE}));

      const tooltip = document.createElement('div');
      tooltip.className = 'hk-tooltip';
      
      const make = (label, ang, type, detail, title, id) => {
        const el = document.createElement('div');
        el.className='hk-badge';
        el.dataset.id = id;
        el.textContent=label;
        if (id === 'power') el.classList.add('is-power');
        if (id === 'mute') el.classList.add('is-mute');
        if(label==='S'||label==='L') el.dataset.shift='1';
        el.style.setProperty('--ang',`${ang}deg`);
        
        el.addEventListener('mouseenter', () => {
            tooltip.textContent = title;
            tooltip.style.opacity = '1';
            const badgeRect = el.getBoundingClientRect();
            const ringRect = ring.getBoundingClientRect();
            const leftPos = badgeRect.left - ringRect.left + badgeRect.width / 2;
            tooltip.style.left = `${leftPos}px`;
            if (label === 'O') {
                tooltip.style.top = `${badgeRect.top - ringRect.top + badgeRect.height + 8}px`;
                tooltip.style.transform = 'translate(-50%, 0)';
            } else {
                tooltip.style.top = `${badgeRect.top - ringRect.top - 8}px`;
                tooltip.style.transform = 'translate(-50%, -100%)';
            }
        });
        el.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
        el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
          hotkeysEl.dispatchEvent(new CustomEvent(type,{detail,bubbles:true,composed:true}));
        },{passive:false});
        return el;
      };

      const frag = document.createDocumentFragment();
      for (const [, label, type, detail, ang, title, id] of BADGES) {
        frag.appendChild(make(label, ang, type, detail, title, id));
      }
      
      ring.appendChild(frag);
      ring.appendChild(tooltip);
      canvasContainer.appendChild(ring);

      const updateIcons = (state = {}) => {
        const setActive = (id, isActive) => {
          const badge = ring.querySelector(`[data-id="${id}"]`);
          if (badge) badge.dataset.active = !!isActive;
        };
        setActive('power', state.isPlaying);
        setActive('mute', state.isMuted);
        setActive('sequencer', state.sequencerVisible);
        setActive('seq-play', state.sequencePlaying);
        setActive('sig-mode', state.isSequenceSignatureMode);
        setActive('loop', state.isLoopEnabled);
        setActive('latch', state.isLatchOn);
      };
      app.updateHkIcons = updateIcons;
      if (app.state) updateIcons(app.state);

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
        const PAD=10, SZ=30, HALF=SZ/2, OUT=28; // Increased OUT for better spacing
        
        // --- POSITIONING FIX ---
        // 1. Calculate the base radius from the canvas size.
        const baseR = (Math.min(rect.width, rect.height) / 2) + OUT;

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
          
          // 2. Start with the canvas-based radius.
          let r = baseR;

          // 3. Clamp this radius only if it would go off-screen.
          if(ux > 0) r = Math.min(r, (maxX - cx) / ux);
          if(ux < 0) r = Math.min(r, (cx - minX) / -ux);
          if(uy > 0) r = Math.min(r, (maxY - cy) / uy);
          if(uy < 0) r = Math.min(r, (cy - minY) / -uy);
          
          r = Math.max(HALF + 4, Math.floor(r));
          el.style.setProperty('--r', `${r}px`);
          el.style.transform = `translate(-50%,-50%) rotate(${ang}deg) translateX(${r}px)`;
        });
      };

      adjust();
      addEventListener('resize', adjust, { passive:true });
      const controls = sr.querySelector('osc-controls');
      if (controls) { try { new ResizeObserver(adjust).observe(controls); } catch {} }
    })();
  });
})();