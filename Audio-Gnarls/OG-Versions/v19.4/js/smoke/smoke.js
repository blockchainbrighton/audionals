// Smoke test script for the oscilloscope app. This file is imported by
// smoke.html and sets `window.__SMOKE__` when complete. It performs
// lightweight sanity checks to ensure critical elements and APIs are
// present without relying on external audio resources. See
// js/smoke/smoke.html for usage.

import '../engine.js';
import '../shapes.js';
import '../scope-canvas.js';
import '../osc-hotkeys.js';
import '../seq-app.js';
import '../osc-app.js';

function runSmokeTests() {
  const result = { pass: true, details: [] };
  const assert = (cond, desc) => {
    if (!cond) {
      result.pass = false;
      result.details.push(desc);
    }
  };
  try {
    assert(customElements.get('osc-app'), '<osc-app> custom element is defined');
    const app = document.createElement('osc-app');
    document.body.appendChild(app);
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          assert(app.state && typeof app.state === 'object', 'osc-app has a state object');
          assert(Array.isArray(app.shapes) && app.shapes.length > 0, 'osc-app exposes a non-empty shapes array');
          assert(typeof app._onStartRequest === 'function', 'osc-app defines _onStartRequest');
          assert(typeof app.deterministicPreset === 'function', 'deterministicPreset function exists');
          const preset = app.deterministicPreset(app.state.seed || 'test', app.shapes[0]);
          assert(preset && typeof preset === 'object', 'deterministicPreset returns an object');
          app._updateControls?.({ isPlaying: false });
        } catch (err) {
          result.pass = false;
          result.details.push(err && err.message || String(err));
        } finally {
          app.remove();
          window.__SMOKE__ = result;
          resolve(result);
        }
      }, 100);
    });
  } catch (err) {
    result.pass = false;
    result.details.push(err && err.message || String(err));
    window.__SMOKE__ = result;
    return Promise.resolve(result);
  }
}

export default runSmokeTests;