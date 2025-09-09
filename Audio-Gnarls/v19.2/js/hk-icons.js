// js/hk-icons.js
// On-screen round badges for the most useful hotkeys.
// Implements tooltips, active states, and correct edge-snapped positioning.
// Special: SIGN button is now a centered, horizontal, shimmering badge at the bottom.

(() => {
  // --- Data for each badge ---
  // Structure: [hotkey, label, eventType, eventDetail, angle, tooltipTitle, uniqueId]
  const BADGES = [
    ['o','O','hk-toggle-power',      null,  -90, 'Power',          'power'],
    ['m','M','hk-toggle-mute',       null,  -45, 'Mute',           'mute'],
    ['c','C','hk-toggle-controls',   null,  -15, 'Controls',       'controls'],
    ['q','Q','hk-toggle-sequencer',  null,   10, 'Sequencer',      'sequencer'],
    ['p','P','hk-toggle-seq-play',   null,   35, 'Play/Pause',     'seq-play'],
    ['s','SIGN','hk-audio-signature', null,   0, 'Signature',       'signature'], // Changed label to 'SIGN' and angle to 0
    ['S','S','hk-toggle-signature',  null,  135, 'Signature Mode', 'sig-mode'],
    ['l','l','hk-toggle-loop',       null,  180, 'Loop',           'loop'],
    ['L','L','hk-toggle-latch',      null, -135, 'Latch',          'latch'],
  ];

  const STYLE = `
    .hk-ring {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 40;
    }

    .hk-badge {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 60px;
      height: 60px;
      margin: -15px 0 0 -15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font: 700 28px/1 "Courier New", monospace;
      color: #888;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #555;
      border-radius: 999px;
      box-shadow: 0 0 0 1px #000;
      backdrop-filter: blur(4px);
      user-select: none;
      cursor: pointer;
      letter-spacing: .02em;
      transition: transform .15s ease-out, box-shadow .15s ease-out, background .15s ease-out,
                  border-color .15s ease-out, opacity .25s ease-out, color .15s ease-out, visibility .25s;
      transform: translate(-50%, -50%) rotate(var(--ang,0deg)) translateX(56px) scale(1);
      touch-action: manipulation;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    /* --- Rule to show buttons --- */
    .hk-badge.is-visible {
      opacity: 0.6;
      visibility: visible;
      pointer-events: auto;
    }

    .hk-badge.is-visible:hover {
      opacity: 1;
      color: #ddd;
      background: rgba(25, 25, 25, 0.75);
      border-color: #aaa;
      box-shadow: 0 0 0 1px #000, 0 0 10px rgba(200, 200, 200, 0.3);
      transform: translate(-50%, -50%) rotate(var(--ang,0deg)) translateX(var(--r,56px)) scale(1.1);
    }

    .hk-badge.is-visible:active {
      transform: translate(-50%, -50%) rotate(var(--ang,0deg)) translateX(var(--r,56px)) scale(1.05);
    }

    .hk-badge[data-shift="1"] {
      border-color: #6b7fad;
    }

    .hk-badge span {
      display: inline-block;
      transform: rotate(calc(var(--ang, 0deg) * -1));
      transition: transform .08s ease;
    }

    .hk-badge.is-power[data-active="true"] {
      opacity: 1;
      background: #a11221;
      color: #f0f0f0;
      border-color: #d34e5a;
      box-shadow: 0 0 12px 2px #d32a3988, 0 0 3px #ff7484cc;
      text-shadow: 0 0 4px #ddd;
    }

    .hk-badge.is-mute[data-active="true"] {
      opacity: 1;
      background: #851020;
      color: #e0e0e0;
      border-color: #d0405e;
      box-shadow: 0 0 8px #d0405e55;
    }

    .hk-badge[data-active="true"] {
      opacity: 1;
      background: #1a2f21;
      color: #ade5c2;
      border-color: #409060;
      box-shadow: 0 0 8px #40906055;
    }

    .hk-badge[data-id="sig-mode"][data-active="true"] {
      opacity: 1;
      background: #1a253a;
      border-color: #6a82cc;
      color: #ced5e0;
      box-shadow: 0 0 12px #6a82cc55;
    }

    /* --- Tooltip --- */
    .hk-tooltip {
      position: absolute;
      top: 0;
      left: 0;
      color: #ccc;
      background: rgba(20, 20, 20, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 50;
      opacity: 0;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 5px 15px rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
      transform-origin: center;
      transform: var(--tooltip-transform, translate(-50%, -100%)) scale(0.9);
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .hk-tooltip.is-visible {
      opacity: 1;
      transform: var(--tooltip-transform, translate(-50%, -100%)) scale(1);
    }

    /* --- Special: SIGN button --- */
    @keyframes shimmer-text {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }

    .hk-badge.is-visible[data-id="signature"] {
      /* Horizontal pill shape */
      width: 160px;
      height: 72px;
      margin: 0;
      padding: 0;
      border-radius: 18px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: transparent;
      font-size: 40px;
      font-weight: bold;
      letter-spacing: 0.05em;
      box-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(6px);
      overflow: hidden;
      opacity: 0.7;
      z-index: 41;
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translate(-50%, calc(-100% - 10px)); /* MOVED: Position inside canvas bottom */
      transition: all 0.2s ease;
    }

    .hk-badge.is-visible[data-id="signature"] span {
      background: linear-gradient(90deg,
        #ff00de 0%,
        #00f7ff 25%,
        #ff00de 50%,
        #00f7ff 75%,
        #ff00de 100%
      );
      background-size: 200% auto;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: shimmer-text 4s linear infinite;
      display: inline-block;
      width: 100%;
      text-align: center;
      text-shadow: none;
    }

    .hk-badge.is-visible[data-id="signature"][data-active="true"] {
      opacity: 1;
      border-color: #fff;
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.4),
                  0 0 20px rgba(150, 100, 255, 0.5);
    }

    .hk-badge.is-visible[data-id="signature"][data-active="true"] span {
      animation-duration: 1.5s;
      background: linear-gradient(90deg,
        #ff00de 0%,
        #00f7ff 30%,
        #f0f 50%,
        #00f7ff 70%,
        #ff00de 100%
      );
      background-size: 150% auto;
    }

    .hk-badge.is-visible[data-id="signature"]:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.3);
      transform: translate(-50%, calc(-100% - 12px)); /* MOVED: Adjust hover position */
    }

    .hk-badge.is-visible[data-id="signature"]:active {
      transform: translate(-50%, calc(-100% - 11px)); /* MOVED: Adjust active position */
    }
  `;

  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn));

  ready(() => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    const waitFor = (pred, ms = 6000) => new Promise((resolve) => {
      const t0 = performance.now();
      (function tick() {
        if (pred()) return resolve(true);
        if (performance.now() - t0 > ms) return resolve(false);
        requestAnimationFrame(tick);
      })();
    });

    (async () => {
      const ok = await waitFor(() => app.shadowRoot?.querySelector('#canvasContainer') && app.shadowRoot?.querySelector('osc-hotkeys'));
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

        // Power button is visible by default
        if (id === 'power') {
          el.classList.add('is-visible');
          el.classList.add('is-power');
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = label;
        el.appendChild(textSpan);

        if (id === 'mute') el.classList.add('is-mute');
        if (label === 'S' || label === 'L') el.dataset.shift = '1';

        el.style.setProperty('--ang', `${ang}deg`);

        el.addEventListener('mouseenter', () => {
          tooltip.textContent = title;
          const badgeRect = el.getBoundingClientRect();
          const ringRect = ring.getBoundingClientRect();

          const leftPos = badgeRect.left - ringRect.left + badgeRect.width / 2;
          tooltip.style.left = `${leftPos}px`;

          if (el.dataset.id === 'signature') {
            // Special tooltip placement for bottom-centered button
            tooltip.style.top = `${badgeRect.top - ringRect.top - 12}px`;
            tooltip.style.setProperty('--tooltip-transform', 'translate(-50%, -100%)');
          } else if (label === 'O') {
            tooltip.style.top = `${badgeRect.top - ringRect.top + badgeRect.height + 8}px`;
            tooltip.style.setProperty('--tooltip-transform', 'translate(-50%, 0)');
          } else {
            tooltip.style.top = `${badgeRect.top - ringRect.top - 8}px`;
            tooltip.style.setProperty('--tooltip-transform', 'translate(-50%, -100%)');
          }

          tooltip.classList.add('is-visible');
        });

        el.addEventListener('mouseleave', () => {
          tooltip.classList.remove('is-visible');
        });

        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          hotkeysEl.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
        }, { passive: false });

        return el;
      };

      const frag = document.createDocumentFragment();
      for (const [, label, type, detail, ang, title, id] of BADGES) {
        frag.appendChild(make(label, ang, type, detail, title, id));
      }

      ring.appendChild(frag);
      ring.appendChild(tooltip);
      canvasContainer.appendChild(ring);

      // Update function
      const updateIcons = (state = {}) => {
        const isSynthOn = !!state.isPlaying;

        // Toggle visibility for non-power buttons
        ring.querySelectorAll('.hk-badge:not([data-id="power"])').forEach(badge => {
          badge.classList.toggle('is-visible', isSynthOn);
        });

        const setActive = (id, isActive) => {
          const badge = ring.querySelector(`[data-id="${id}"]`);
          if (badge) badge.dataset.active = !!isActive;
        };

        setActive('power', isSynthOn);
        setActive('mute', state.isMuted);
        setActive('sequencer', state.sequencerVisible);
        setActive('seq-play', state.sequencePlaying);
        setActive('sig-mode', state.isSequenceSignatureMode);
        setActive('loop', state.isLoopEnabled);
        setActive('latch', state.isLatchOn);

        // Signature playing state
        const isSignaturePlaying = state.isSignaturePlaying || state.signatureActive || false;
        setActive('signature', isSignaturePlaying);
      };

      app.updateHkIcons = updateIcons;
      if (app.state) updateIcons(app.state);

      // Safe area helper
      const getSafe = () => {
        const d = document.createElement('div');
        d.style.cssText = 'position:fixed;inset:auto 0 0 0;height:0;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0);visibility:hidden';
        document.body.appendChild(d);
        const cs = getComputedStyle(d);
        const s = {
          top: parseFloat(cs.paddingTop) || 0,
          right: parseFloat(cs.paddingRight) || 0,
          bottom: parseFloat(cs.paddingBottom) || 0,
          left: parseFloat(cs.paddingLeft) || 0
        };
        d.remove();
        return s;
      };

      // Layout adjustment
      const adjust = () => {
        const rect = canvasContainer.getBoundingClientRect();
        if (!rect || rect.width < 100) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const inset = getSafe();
        const PAD = 10;
        const OUT = 28;
        const baseR = (Math.min(rect.width, rect.height) / 2) + OUT;

        const controls = sr.querySelector('osc-controls');
        const cr = (controls && controls.offsetParent !== null) ? controls.getBoundingClientRect() : null;

        // Position all badges except SIGN using radial layout
        ring.querySelectorAll('.hk-badge').forEach(el => {
          if (el.dataset.id === 'signature') return; // Skip SIGN

          const elHalf = 15;
          const localMinX = inset.left + PAD + elHalf;
          const localMaxX = vw - inset.right - PAD - elHalf;
          const localMinY = inset.top + PAD + elHalf;
          const localMaxY = cr
            ? Math.max(localMinY, cr.top - PAD - elHalf)
            : vh - inset.bottom - PAD - elHalf;

          const ang = parseFloat(el.style.getPropertyValue('--ang')) || 0;
          const rad = ang * Math.PI / 180;
          const ux = Math.cos(rad);
          const uy = Math.sin(rad);

          let r = baseR;
          let screenMaxR = Infinity;
          if (ux > 0) screenMaxR = Math.min(screenMaxR, (localMaxX - cx) / ux);
          if (ux < 0) screenMaxR = Math.min(screenMaxR, (cx - localMinX) / -ux);
          if (uy > 0) screenMaxR = Math.min(screenMaxR, (localMaxY - cy) / uy);
          if (uy < 0) screenMaxR = Math.min(screenMaxR, (cy - localMinY) / -uy);

          r = Math.min(r, screenMaxR);
          r = Math.max(elHalf + 4, Math.floor(r));
          el.style.setProperty('--r', `${r}px`);
          el.style.transform = `translate(-50%,-50%) rotate(${ang}deg) translateX(${r}px) scale(1)`;
        });

        // REMOVED: Manual positioning for the SIGN button is now handled by CSS.
      };

      // Initial layout and updates
      adjust();
      window.addEventListener('resize', adjust, { passive: true });
      const controls = sr.querySelector('osc-controls');
      if (controls) {
        try {
          new ResizeObserver(adjust).observe(controls);
        } catch (e) {
          console.warn('ResizeObserver not supported for controls');
        }
      }
    })();
  });
})();