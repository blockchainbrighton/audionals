// js/controls-visibility.js
// Hide <osc-controls> on load, toggle it when C is pressed (hk-toggle-controls).

(() => {
  const ready = (fn) => (document.readyState !== 'loading'
    ? fn()
    : document.addEventListener('DOMContentLoaded', fn));

  ready(async () => {
    const app = document.querySelector('osc-app');
    if (!app) return;

    // wait for shadow, controls, and hotkeys
    const ok = await new Promise(res => {
      const t0 = performance.now();
      (function tick(){
        if (app.shadowRoot &&
            app.shadowRoot.querySelector('osc-controls') &&
            app.shadowRoot.querySelector('osc-hotkeys')) return res(true);
        if (performance.now() - t0 > 6000) return res(false);
        requestAnimationFrame(tick);
      })();
    });
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
