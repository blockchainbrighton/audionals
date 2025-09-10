// js/controls-visibility.js
// Hide <osc-controls> on load, toggle it when C is pressed (hk-toggle-controls).
// v20.2 - Use shared utilities from utils.js

import { ready, waitFor } from './utils.js';

(() => {
  ready(async () => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    // wait for shadow, controls, and hotkeys
    const ok = await waitFor(() => 
      app.shadowRoot &&
      app.shadowRoot.querySelector('osc-controls') &&
      app.shadowRoot.querySelector('osc-hotkeys')
    );
    if (!ok) return;

    const sr = app.shadowRoot;
    const controls = sr.querySelector('osc-controls');
    const hotkeys  = sr.querySelector('osc-hotkeys');

    // Hide by default
    controls.style.display = 'none';

    const toggleControls = () => {
      const show = controls.style.display === 'none';
      controls.style.display = show ? 'block' : 'none';
      try { app._fitLayout?.(); } catch {}
      try { controls.dispatchEvent(new Event('controls-resize')); } catch {}
    };

    hotkeys.addEventListener('hk-toggle-controls', toggleControls);
  });
})();
