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
        const adjustRadius = () => {
        const rect = canvasContainer.getBoundingClientRect();
        const side = Math.min(rect.width, rect.height);        // canvas is square
        const badgeHalf = 15;                                   // matches 30px badge
        const outside = 22;                                     // how far past the edge you want
        const r = (side / 2) + outside;                         // center -> just outside edge
        // Safety clamps for tiny screens (optional)
        const R = Math.max(badgeHalf + 8, Math.min(9999, Math.round(r)));
        ring.style.setProperty('--r', `${R}px`);
        };
      adjustRadius();
      window.addEventListener('resize', adjustRadius, { passive:true });

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
