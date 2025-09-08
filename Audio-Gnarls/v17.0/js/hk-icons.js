// js/hk-icons.js
// Minimal clickable hotkey badges around the canvas.
// Dispatches the same hk-* events your <osc-hotkeys> emits.

(() => {
  const BADGES = [
    ['o','O','hk-toggle-power',      null,  -90], // top
    ['m','M','hk-toggle-mute',       null,  -45], // top-right
    ['c','C','hk-toggle-sequencer',  null,    0], // right
    ['p','P','hk-toggle-seq-play',   null,   45], // bottom-right
    ['s','s','hk-audio-signature',   null,   90], // bottom
    ['S','S','hk-toggle-signature',  null,  135], // bottom-left (Shift+S)
    ['l','l','hk-toggle-loop',       null,  180], // left
    ['L','L','hk-toggle-latch',      null, -135], // top-left (Shift+L)
  ];

  const STYLE = `
    .hk-ring {
      position:absolute; inset:0; pointer-events:none; z-index:40; /* above canvas */
    }
    .hk-badge {
      position:absolute; left:50%; top:50%;
      /* center anchor, then rotate + translateX to place on ring */
      width:30px; height:30px; margin:-15px 0 0 -15px;
      display:flex; align-items:center; justify-content:center;
      font: 700 14px/1 "Courier New", monospace;
      color:#fff; background:#000; border:1px solid #999; border-radius:999px;
      text-transform:none; letter-spacing:.02em;
      box-shadow: 0 0 0 1px #000, 0 0 10px #0008; /* subtle halo on black bg */
      pointer-events:auto; user-select:none; cursor:pointer;
      transition: transform .08s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
      touch-action: manipulation;
    }
    .hk-badge:hover { background:#101010; border-color:#bcd; box-shadow:0 0 0 1px #000, 0 0 12px #223a; }
    .hk-badge:active { transform: translate(-50%, -50%) rotate(var(--ang,0deg)) translateX(var(--r, 56px)) scale(.96); }
    .hk-badge[data-shift="1"] { border-color:#7aa2ff; color:#ffffff; }
    /* Distance beyond canvas edge; adjusted dynamically, but default works */
    .hk-ring { --r: 56px; }
  `;

  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(() => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    const waitFor = (pred, timeout=6000) => new Promise(res => {
      const t0 = performance.now();
      (function tick(){
        if (pred()) return res(true);
        if (performance.now() - t0 > timeout) return res(false);
        requestAnimationFrame(tick);
      })();
    });

    (async () => {
      // Need the shadow root, canvas container, and existing <osc-hotkeys>
      const ok = await waitFor(() =>
        app.shadowRoot &&
        app.shadowRoot.querySelector('#canvasContainer') &&
        app.shadowRoot.querySelector('osc-hotkeys')
      );
      if (!ok) return;

      const sr = app.shadowRoot;
      const canvasContainer = sr.querySelector('#canvasContainer');
      const hotkeysEl = sr.querySelector('osc-hotkeys');
      if (!canvasContainer || !hotkeysEl) return;

      // Ensure the container can host absolutely-positioned children
      const ccStyle = getComputedStyle(canvasContainer);
      if (ccStyle.position === 'static') canvasContainer.style.position = 'relative';

      // Build ring + styles
      const ring = document.createElement('div');
      ring.className = 'hk-ring';
      const style = document.createElement('style');
      style.textContent = STYLE;
      ring.appendChild(style);

      // Factory
      const makeBadge = (label, angleDeg, type, detail) => {
        const el = document.createElement('div');
        el.className = 'hk-badge';
        el.textContent = label;
        if (label === 'S' || label === 'L') el.dataset.shift = '1';
        el.style.setProperty('--ang', `${angleDeg}deg`);

        // Place using rotate + translateX (reliable everywhere)
        el.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg) translateX(var(--r, 56px))`;

        const fire = () => {
          hotkeysEl.dispatchEvent(new CustomEvent(type, { detail, bubbles:true, composed:true }));
        };
        el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fire(); }, { passive:false });
        el.addEventListener('pointerdown', (e) => { e.stopPropagation(); }, { passive:true });

        return el;
      };

      // Add badges
      const frag = document.createDocumentFragment();
      for (const [, label, type, detail, ang] of BADGES) {
        frag.appendChild(makeBadge(label, ang, type, detail));
      }
      ring.appendChild(frag);
      canvasContainer.appendChild(ring);

      // Keep radius right outside the canvas edge
        // Read iOS safe-area insets (works everywhere; 0s where unsupported)
        function getSafeInsets(){
        const d = document.createElement('div');
        d.style.cssText = `
            position:fixed; inset:auto 0 0 0; height:0;
            padding-left:env(safe-area-inset-left,0px);
            padding-right:env(safe-area-inset-right,0px);
            padding-top:env(safe-area-inset-top,0px);
            padding-bottom:env(safe-area-inset-bottom,0px);
            visibility:hidden; pointer-events:none;`;
        document.body.appendChild(d);
        const cs = getComputedStyle(d);
        const s = {
            top: parseFloat(cs.paddingTop)||0,
            right: parseFloat(cs.paddingRight)||0,
            bottom: parseFloat(cs.paddingBottom)||0,
            left: parseFloat(cs.paddingLeft)||0
        };
        d.remove();
        return s;
        }

        // Clamp badges so they never go off-screen, and keep bottom ones above controls
        const adjustPlacement = () => {
        const rect = canvasContainer.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top  + rect.height/2;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const inset = getSafeInsets();

        const PAD = 10;               // viewport padding
        const BADGE = 30;             // badge size (px) — keep in sync with CSS
        const HALF = BADGE / 2;
        const OUTSIDE = 22;           // aim just outside the canvas
        const baseR = (Math.min(rect.width, rect.height) / 2) + OUTSIDE;

        // If controls are visible, don't let badges overlap them
        const controls = sr.querySelector('osc-controls');
        const controlsRect = (controls && controls.offsetParent !== null)
            ? controls.getBoundingClientRect()
            : null;

        const minX = inset.left + PAD + HALF;
        const maxX = vw - inset.right - PAD - HALF;
        const minY = inset.top + PAD + HALF;
        // keep badges above controls if visible, else bottom inset
        const capBottom = controlsRect ? (controlsRect.top - PAD - HALF) : (vh - inset.bottom - PAD - HALF);
        const maxY = Math.max(minY, capBottom);

        ring.querySelectorAll('.hk-badge').forEach(el => {
            const ang = parseFloat(el.style.getPropertyValue('--ang')) || 0;
            const rad = ang * Math.PI / 180;
            const ux = Math.cos(rad), uy = Math.sin(rad);

            // Start with desired radius
            let r = baseR;

            // Clamp by horizontal boundaries
            if (ux > 0) r = Math.min(r, (maxX - cx) / ux);
            if (ux < 0) r = Math.min(r, (cx - minX) / -ux);

            // Clamp by vertical boundaries
            if (uy > 0) r = Math.min(r, (maxY - cy) / uy);
            if (uy < 0) r = Math.min(r, (cy - minY) / -uy);

            // Keep r sane
            r = Math.max(HALF + 4, Math.floor(r));

            // Apply per-badge transform
            el.style.transform = `translate(-50%, -50%) rotate(${ang}deg) translateX(${r}px)`;
        });
        };

      adjustPlacement();
        window.addEventListener('resize', adjustPlacement, { passive:true });

        // Also re-run when the controls show/hide (optional but recommended)
        const controls = sr.querySelector('osc-controls');
        if (controls) {
        try { new ResizeObserver(adjustPlacement).observe(controls); } catch {}
        }

      // (Optional) If you decide you want them hidden while controls are visible,
      // uncomment the block below.
      /*
      const controls = sr.querySelector('osc-controls');
      const sync = () => {
        const vis = controls && controls.offsetParent !== null && controls.getBoundingClientRect().height > 8;
        ring.style.display = vis ? 'none' : 'block';
      };
      sync();
      try { new ResizeObserver(sync).observe(controls); } catch {}
      window.addEventListener('resize', sync, { passive:true });
      */
    })();
  });
})();
