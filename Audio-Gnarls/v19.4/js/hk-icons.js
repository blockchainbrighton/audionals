// js/hk-icons.js
// On-screen round badges for the most useful hotkeys.
// Simplified: badges are always upright circles with letters, only positioned radially.
// Special: SIGN button is a centered horizontal badge; FR badges cluster to its right.

(() => {
  const BADGES = [
    ['o','O','hk-toggle-power',      null,  -90, 'Power',               'power'],
    ['m','M','hk-toggle-mute',       null,  -45, 'Mute',                'mute'],
    ['c','C','hk-toggle-controls',   null,  -15, 'Controls',            'controls'],
    ['q','Q','hk-toggle-sequencer',  null,   10, 'Show/Hide Sequencer', 'sequencer'],
    ['p','P','hk-toggle-seq-play',   null,   35, 'Play/Pause Sequence', 'seq-play'],

    // Freestyle badges
    ['r','FR','fr-toggle',            null,   60, 'Freestyle Recording',     'fr-ready'],
    ['R','PF','fr-play',              null,   85, 'Play Freestyle Recording', 'fr-playback'],

    ['s','SIGN','hk-audio-signature',null,    0, 'Signature',           'signature'],
    ['S','S','hk-toggle-signature',  null,  135, 'Signature Mode',      'sig-mode'],
    ['l','L','hk-toggle-loop',       null,  180, 'Loop',                'loop'],
    ['L','L','hk-toggle-latch',      null, -135, 'Latch',               'latch'],
  ];

  const STYLE = `
  .hk-ring{
    position:absolute; inset:0; pointer-events:none; z-index:40;
    /* Fluid sizing (JS sets --scale in adjust()) */
    --scale:1;
    --badge:calc(60px * var(--scale));
    --badge-font:calc(28px * var(--scale));
    --gap:calc(10px * var(--scale));
    --ring-outset:calc(28px * var(--scale));

    /* Symmetric offsets from the SIGN badge */
    --cluster-left:calc(-208px * var(--scale));
    --cluster-right:calc(208px * var(--scale));
    --cluster-left-sm:calc(-172px * var(--scale));
    --cluster-right-sm:calc(172px * var(--scale));
  }

  .hk-badge{
    position:absolute; left:50%; top:50%;
    width:var(--badge); height:var(--badge);
    display:flex; align-items:center; justify-content:center;
    font:700 var(--badge-font)/1 "Courier New", monospace; color:#888;
    background:rgba(0,0,0,0.5); border:1px solid #555; border-radius:999px;
    box-shadow:0 0 0 1px #000; backdrop-filter:blur(4px);
    user-select:none; cursor:pointer; letter-spacing:.02em;
    transition:transform .15s ease-out, box-shadow .15s ease-out,
               background .15s ease-out, border-color .15s ease-out,
               opacity .25s ease-out, color .15s ease-out, visibility .25s;
    transform:translate(-50%,-50%) scale(1);
    touch-action:manipulation; opacity:0; visibility:hidden; pointer-events:none;
  }

  .hk-badge.is-visible{opacity:.6; visibility:visible; pointer-events:auto;}
  .hk-badge.is-visible:hover:not([data-active="true"]){
    opacity:1; color:#ddd; background:rgba(25,25,25,.75); border-color:#aaa;
    box-shadow:0 0 0 1px #000,0 0 10px rgba(200,200,200,.3);
    transform:translate(-50%,-50%) scale(1.1);
  }
  .hk-badge.is-visible:active{ transform:translate(-50%,-50%) scale(1.05); }

  .hk-badge[data-shift="1"]{ border-color:#6b7fad; }
  .hk-badge span{ display:inline-block; }

  .hk-badge.is-power[data-active="true"]{
    opacity:1; background:#a11221; color:#f0f0f0; border-color:#d34e5a;
    box-shadow:0 0 12px 2px #d32a3988,0 0 3px #ff7484cc; text-shadow:0 0 4px #ddd;
  }
  .hk-badge.is-mute[data-active="true"]{
    opacity:1; background:#851020; color:#e0e0e0; border-color:#d0405e;
    box-shadow:0 0 8px #d0405e55;
  }
  .hk-badge[data-active="true"]{
    opacity:1; background:#1a2f21; color:#ade5c2; border-color:#409060;
    box-shadow:0 0 8px #40906055;
  }
  .hk-badge[data-id="sig-mode"][data-active="true"]{
    opacity:1; background:#1a253a; border-color:#6a82cc; color:#ced5e0;
    box-shadow:0 0 12px #6a82cc55;
  }
  .hk-badge[data-disabled="1"]{
    opacity:.25!important; pointer-events:none!important; filter:grayscale(.4);
  }

  /* Tooltip */
  .hk-tooltip{
    position:absolute; top:0; left:0;
    color:#ccc; background:rgba(20,20,20,.6);
    border:1px solid rgba(255,255,255,.15);
    padding:6px 12px; border-radius:6px;
    font-size:13px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    z-index:50; opacity:0; white-space:nowrap; pointer-events:none;
    box-shadow:0 5px 15px rgba(0,0,0,.6);
    backdrop-filter:blur(12px); transform-origin:center;
    transform:var(--tooltip-transform,translate(-50%,-100%)) scale(.9);
    transition:opacity .2s cubic-bezier(.4,0,.2,1),
               transform .2s cubic-bezier(.4,0,.2,1);
  }
  .hk-tooltip.is-visible{
    opacity:1; transform:var(--tooltip-transform,translate(-50%,-100%)) scale(1);
  }

  /* SIGN special */
  @keyframes shimmer-text{0%{background-position:-200% center;}100%{background-position:200% center;}}
  .hk-badge.is-visible[data-id="signature"]{
    width:calc(160px * var(--scale));
    height:calc(72px * var(--scale));
    margin:0; padding:0; border-radius:calc(18px * var(--scale));
    background:rgba(0,0,0,.2); border:1px solid rgba(255,255,255,.3);
    color:transparent; font-size:calc(40px * var(--scale)); font-weight:bold; letter-spacing:.05em;
    box-shadow:0 0 6px rgba(255,255,255,.1); backdrop-filter:blur(6px);
    overflow:hidden; opacity:.7; z-index:41;
    position:absolute; left:50%; top:100%;
    transform:translate(-50%,calc(-100% - var(--gap)));
    transition:all .2s ease;
  }
  .hk-badge.is-visible[data-id="signature"] span{
    background:linear-gradient(90deg,#ff00de 0%,#00f7ff 25%,#ff00de 50%,#00f7ff 75%,#ff00de 100%);
    background-size:200% auto; background-clip:text; -webkit-background-clip:text;
    color:transparent; animation:shimmer-text 4s linear infinite;
    display:inline-block; width:100%; text-align:center; text-shadow:none;
  }
  .hk-badge.is-visible[data-id="signature"][data-active="true"]{
    opacity:1; border-color:#fff;
    box-shadow:0 0 12px rgba(255,255,255,.4),0 0 20px rgba(150,100,255,.5);
  }
  .hk-badge.is-visible[data-id="signature"][data-active="true"] span{
    animation-duration:1.5s;
    background:linear-gradient(90deg,#ff00de 0%,#00f7ff 30%,#f0f 50%,#00f7ff 70%,#ff00de 100%);
    background-size:150% auto;
  }

  /* FR badges aligned with SIGN: Recording left, Playback right */
    .hk-badge.is-visible[data-id="fr-ready"],
    .hk-badge.is-visible[data-id="fr-playback"]{
      left:50%; top:100%; margin:0;
      transform:translate(calc(-50% + var(--x,0px)),calc(-100% - calc(var(--gap) + 4px)));
    }

    .hk-badge.is-visible[data-id="fr-ready"]{   /* FR (record) to the left of SIGN */
      --x:var(--cluster-left);
    }
    .hk-badge.is-visible[data-id="fr-playback"]{ /* PF (playback) to the right of SIGN */
      --x:var(--cluster-right);
    }

    /* Tighter spacing on small screens */
    @media (max-width:520px){
      .hk-badge.is-visible[data-id="fr-ready"]{   --x:var(--cluster-left-sm); }
      .hk-badge.is-visible[data-id="fr-playback"]{--x:var(--cluster-right-sm); }
    }
  /* Onboarding tour highlight */
  .hk-badge.is-tour{
    opacity:1 !important;
    color:#ddd;
    border-color:#aaa;
    box-shadow:0 0 0 1px #000, 0 0 12px rgba(255,255,255,.35);
    transform:translate(-50%,-50%) scale(1.1);
  }
  .hk-badge.is-tour.is-power[data-active="true"]{
    /* keep power's red glow when touring */
    box-shadow:0 0 12px 2px #d32a3988,0 0 3px #ff7484cc,0 0 12px rgba(255,255,255,.25);
  }
  .hk-badge.is-tour[data-id="signature"]{
    opacity:1; border-color:#fff;
    box-shadow:0 0 12px rgba(255,255,255,.4),0 0 20px rgba(150,100,255,.5);
  }
    /* Stacked tour labels (independent tooltips per badge) */
  .hk-tooltip.hk-tour {
    opacity:1; pointer-events:none;
    transition:none;
  }
`;

  const ready = fn =>
    document.readyState !== 'loading'
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    const waitFor = (pred, ms = 6000) =>
      new Promise(resolve => {
        const t0 = performance.now();
        (function tick() {
          if (pred()) return resolve(true);
          if (performance.now() - t0 > ms) return resolve(false);
          requestAnimationFrame(tick);
        })();
      });

    (async () => {
      const ok = await waitFor(
        () => app.shadowRoot?.querySelector('#canvasContainer') && app.shadowRoot?.querySelector('osc-hotkeys')
      );
      if (!ok) return;

      const sr = app.shadowRoot;
      const canvasContainer = sr.querySelector('#canvasContainer');
      const hotkeysEl = sr.querySelector('osc-hotkeys');

      if (getComputedStyle(canvasContainer).position === 'static') {
        canvasContainer.style.position = 'relative';
      }

      const ring = document.createElement('div');
      ring.className = 'hk-ring';
      ring.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));

      const tooltip = document.createElement('div');
      tooltip.className = 'hk-tooltip';

      const make = (label, ang, type, detail, title, id) => {
        const el = document.createElement('div');
        el.className = 'hk-badge';
        el.dataset.id = id;

        if (id === 'power') {
          el.classList.add('is-visible', 'is-power');
        }

        const span = document.createElement('span');
        span.textContent = label;
        el.appendChild(span);

        if (label === 'S' || label === 'L' || (id === 'fr-playback' && label === 'R'))
          el.dataset.shift = '1';
        if (id === 'mute') el.classList.add('is-mute');

        el.dataset.angle = ang;

        el.addEventListener('mouseenter', () => {
          tooltip.textContent = title;
          const badgeRect = el.getBoundingClientRect();
          const ringRect = ring.getBoundingClientRect();
          const leftPos = badgeRect.left - ringRect.left + badgeRect.width / 2;
          tooltip.style.left = `${leftPos}px`;
          if (['signature','fr-ready','fr-playback'].includes(el.dataset.id)) {
            tooltip.style.top = `${badgeRect.top - ringRect.top - 12}px`;
            tooltip.style.setProperty('--tooltip-transform','translate(-50%, -100%)');
          } else if (label === 'O') {
            tooltip.style.top = `${badgeRect.top - ringRect.top + badgeRect.height + 8}px`;
            tooltip.style.setProperty('--tooltip-transform','translate(-50%, 0)');
          } else {
            tooltip.style.top = `${badgeRect.top - ringRect.top - 8}px`;
            tooltip.style.setProperty('--tooltip-transform','translate(-50%, -100%)');
          }
          tooltip.classList.add('is-visible');
        });
        el.addEventListener('mouseleave',()=>tooltip.classList.remove('is-visible'));
        el.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          hotkeysEl.dispatchEvent(new CustomEvent(type, { detail, bubbles:true, composed:true }));
        }, { passive:false });

        return el;
      };

      const frag = document.createDocumentFragment();
      for (const [, label, type, detail, ang, title, id] of BADGES) {
        frag.appendChild(make(label, ang, type, detail, title, id));
      }
      ring.appendChild(frag);
      ring.appendChild(tooltip);
      canvasContainer.appendChild(ring);

      // Track sequencer content via events from <seq-app>
      const seqFilled = new Set();
      let seqHasData = false;

      const recomputeSeqHasData = () => {
        seqHasData = seqFilled.size > 0;
        // Re-run icon update using app.state (so we don't need extra plumbing)
        try { app.updateHkIcons?.(app.state); } catch {}
      };

      hotkeysEl.addEventListener('seq-step-recorded', (e) => {
        // event.detail: { slotIndex, value, ... }
        if (Number.isInteger(e.detail?.slotIndex)) seqFilled.add(e.detail.slotIndex);
        recomputeSeqHasData();
      });

      hotkeysEl.addEventListener('seq-step-cleared', (e) => {
        if (Number.isInteger(e.detail?.slotIndex)) seqFilled.delete(e.detail.slotIndex);
        recomputeSeqHasData();
      });

      hotkeysEl.addEventListener('seq-steps-changed', () => {
        // Step count changed; conservatively clear and let future events repopulate
        seqFilled.clear();
        recomputeSeqHasData();
      });
      

      // Remove all tour artifacts (labels + highlights)
      const cleanupTourArtifacts = () => {
        try { tooltip.classList.remove('is-visible'); } catch {}
        ring.querySelectorAll('.hk-badge.is-tour').forEach(b => b.classList.remove('is-tour'));
        ring.querySelectorAll('.hk-tooltip.hk-tour').forEach(t => t.remove());
        app._hkTourTips = [];
        app._hkTourRunning = false;
      };
      app.cleanupHotkeyTour = cleanupTourArtifacts;

    
   // Tour order uses the BADGES list as-is
    const TOUR_ITEMS = BADGES.map(b => ({ id: b[6], title: b[5] })).filter(x => !!x.id);

    // Public method: light badges one-by-one (stack), hold, then clear
    // Public method: light badges one-by-one (stack), hold, then clear
  const runHotkeyTour = async (opts = {}) => {
    // If a tour is running or artifacts exist, clear first
    if (app._hkTourRunning) return;
    cleanupTourArtifacts();
    app._hkTourRunning = true;

    const step = Math.max(120, Math.min(900, opts.stepMs ?? 260)); // per-badge delay
    const hold = Math.max(500, opts.holdMs ?? 1000);               // all-on hold
    const delay = ms => new Promise(r => setTimeout(r, ms));

    const items = TOUR_ITEMS
      .map(({ id, title }) => {
        const el = ring.querySelector(`.hk-badge[data-id="${id}"]`);
        return el && el.classList.contains('is-visible') ? { el, title } : null;
      })
      .filter(Boolean);

    const makeTourLabel = (el, title) => {
      const tip = document.createElement('div');
      tip.className = 'hk-tooltip hk-tour is-visible';
      tip.textContent = title;

      const badgeRect = el.getBoundingClientRect();
      const ringRect = ring.getBoundingClientRect();
      const leftPos = badgeRect.left - ringRect.left + badgeRect.width / 2;
      tip.style.left = `${leftPos}px`;

      const id = el.dataset.id;
      const label = el.textContent?.trim();
      if (['signature','fr-ready','fr-playback'].includes(id)) {
        tip.style.top = `${badgeRect.top - ringRect.top - 12}px`;
        tip.style.setProperty('--tooltip-transform','translate(-50%,-100%)');
      } else if (label === 'O') {
        tip.style.top = `${badgeRect.top - ringRect.top + badgeRect.height + 8}px`;
        tip.style.setProperty('--tooltip-transform','translate(-50%, 0)');
      } else {
        tip.style.top = `${badgeRect.top - ringRect.top - 8}px`;
        tip.style.setProperty('--tooltip-transform','translate(-50%,-100%)');
      }

      ring.appendChild(tip);
      (app._hkTourTips ||= []).push(tip);
      return tip;
    };

    try {
      for (const { el, title } of items) {
        el.classList.add('is-tour');
        makeTourLabel(el, title);
        await delay(step);
      }
      await delay(hold);
    } finally {
      cleanupTourArtifacts();
    }
  };

    // expose to engine
    app.runHotkeyTour = runHotkeyTour;


      const updateIcons = (state = {}) => {
      const isOn = !!state.isPlaying;

      // if turning off, remove any tour artifacts to avoid orphaned labels
      if (!isOn) { try { app.cleanupHotkeyTour?.(); } catch {} }

      ring.querySelectorAll('.hk-badge:not([data-id="power"])')
        .forEach(b => b.classList.toggle('is-visible', isOn));

        const setActive = (id,v)=>{ const b=ring.querySelector(`[data-id="${id}"]`); if(b) b.dataset.active=!!v; };
        const setDisabled=(id,v)=>{ const b=ring.querySelector(`[data-id="${id}"]`); if(b) b.dataset.disabled=v?'1':''; };

        setActive('power', isOn);
        setActive('mute', state.isMuted);
        setActive('sequencer', state.sequencerVisible);
        setActive('seq-play', state.sequencePlaying);
        setActive('sig-mode', state.isSequenceSignatureMode);
        setActive('loop', state.isLoopEnabled);
        setActive('latch', state.isLatchOn);

        const sigPlay = state.isSignaturePlaying || state.signatureActive || false;
        setActive('signature', sigPlay);

        setActive('fr-ready', !!state.isFreestyleMode);
        setActive('fr-playback', !!state.freestylePlayback);
        setDisabled('fr-playback', !state.freestyleRecording);
      };
      app.updateHkIcons = updateIcons;
      if (app.state) updateIcons(app.state);

      const getSafe = () => {
        const d = document.createElement('div');
        d.style.cssText='position:fixed;inset:auto 0 0 0;height:0;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0);visibility:hidden';
        document.body.appendChild(d);
        const cs=getComputedStyle(d);
        const s={top:parseFloat(cs.paddingTop)||0,right:parseFloat(cs.paddingRight)||0,bottom:parseFloat(cs.paddingBottom)||0,left:parseFloat(cs.paddingLeft)||0};
        d.remove(); return s;
      };

      const adjust = () => {
        try { app.cleanupHotkeyTour?.(); } catch {}  // prevent mispositioned tour labels
        const rect = canvasContainer.getBoundingClientRect();
        if (!rect || rect.width < 100) return;
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        const vw = window.innerWidth, vh = window.innerHeight;
        const inset = getSafe(), PAD=10, OUT=28;
        const baseR = Math.min(rect.width, rect.height)/2 + OUT;

        const controls = sr.querySelector('osc-controls');
        const cr = (controls && controls.offsetParent!==null)?controls.getBoundingClientRect():null;

        ring.querySelectorAll('.hk-badge').forEach(el=>{
          const id = el.dataset.id;
          if (['signature','fr-ready','fr-playback'].includes(id)) return;
          const ang = parseFloat(el.dataset.angle)||0;
          const rad = ang*Math.PI/180;
          const ux=Math.cos(rad), uy=Math.sin(rad);

          const elHalf=15;
          const localMinX=inset.left+PAD+elHalf;
          const localMaxX=vw-inset.right-PAD-elHalf;
          const localMinY=inset.top+PAD+elHalf;
          const localMaxY=cr?Math.max(localMinY,cr.top-PAD-elHalf):vh-inset.bottom-PAD-elHalf;

          let r=baseR, screenMaxR=Infinity;
          if (ux>0) screenMaxR=Math.min(screenMaxR,(localMaxX-cx)/ux);
          if (ux<0) screenMaxR=Math.min(screenMaxR,(cx-localMinX)/-ux);
          if (uy>0) screenMaxR=Math.min(screenMaxR,(localMaxY-cy)/uy);
          if (uy<0) screenMaxR=Math.min(screenMaxR,(cy-localMinY)/-uy);
          r=Math.min(r,screenMaxR);
          r=Math.max(elHalf+4,Math.floor(r));

          const dx=Math.cos(rad)*r;
          const dy=Math.sin(rad)*r;
          el.style.transform=`translate(${dx}px,${dy}px) translate(-50%,-50%) scale(1)`;
        });
      };

      adjust();
      window.addEventListener('resize', adjust,{passive:true});
      const controls = sr.querySelector('osc-controls');
      if (controls) { try { new ResizeObserver(adjust).observe(controls); } catch {} }
    })();
  });
})();
