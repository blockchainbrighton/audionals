// js/hud-visualizer.js

(() => {
    // --- Dependency Check ---
    // Exit gracefully if the core configuration is not available.
    if (!window.HUD_CONFIGS) {
      console.warn("HUD Visualizer disabled: window.HUD_CONFIGS not found. Make sure hud-config.js is loaded.");
      return;
    }
  
    // --- Unpack dependencies from global scope ---
    const { SEED, BASE_CFG, SEED_CONFIGS } = window.HUD_CONFIGS;
  
    // === Visual Constants & State ===
    const ANIMATION_CONFIG = { helmet: { mode: "fade" }, hud: { mode: "fade" } };
    const HEARTBEAT_SETTINGS = { bpm: 104.15 };
  
    // === Geometry & Drawing Helpers ===
    const updateGeometry = (geom, cvs) => {
      geom.helmet = { x: 10, y: 10, w: 100, h: 40 };
      geom.visor = { x: 20, y: 20, w: 80, h: 30 };
    };
  
    const grain = (ctx, geom, noise, nCtx, CFG) => {
      const { w, h } = geom.visor;
      noise.width = w;
      noise.height = h;
      const d = nCtx.createImageData(w, h);
      const alpha = CFG.flashing ? 40 : 18;
      for (let i = 0; i < d.data.length; i += 4) {
        const g = Math.random() * 255 | 0;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = g;
        d.data[i + 3] = alpha;
      }
      nCtx.putImageData(d, 0, 0);
      nCtx.save();
      nCtx.globalCompositeOperation = "destination-in";
      nCtx.beginPath();
      nCtx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      nCtx.fill();
      nCtx.restore();
      ctx.drawImage(noise, geom.visor.x, geom.visor.y);
    };
  
    const curve = (ctx, x, y, w, h) => {
      ctx.moveTo(x, y + h / 2);
      ctx.bezierCurveTo(x + w / 3, y, x + 2 * w / 3, y + h, x + w, y + h / 2);
    };
  
    // === Animation State Management ===
    const setupAnimationState = (isPlaying, state, helmet, cvs) => {
      state.startTime = isPlaying ? performance.now() : 0;
      state.helmet = { fadeInTriggered: 0, fadeOutTriggered: 0 };
      state.hud = { fadeInTriggered: 0, fadeOutTriggered: 0 };
  
      Object.entries({ helmet, hud: cvs }).forEach(([key, el]) => {
        if (!el) return;
        el.style.transition = 'none';
        el.style.opacity = isPlaying ? (ANIMATION_CONFIG[key]?.mode === 'fade' ? '0' : '1') : '1';
      });
    };
  
    // === Main Animation Loop ===
    const createRenderLoop = (ctx, cvs, geom, CFG, noise, nCtx) => {
      return t => {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        const o = geom.visor;
  
        // Clip subsequent drawing to the visor area
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
        ctx.clip();
  
        if (CFG.sineWave) {
          // Placeholder for sine wave logic
        } else if (CFG.ecg) {
          ctx.strokeStyle = "#0ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          curve(ctx, o.x, o.y, o.w, o.h);
          ctx.stroke();
        }
        // Future text rendering would go here, inside the clip
  
        ctx.restore(); // Remove clipping
  
        // Grain effect is drawn over everything
        if (CFG.flashing) {
          grain(ctx, geom, noise, nCtx, CFG);
        }
      };
    };
  
  
    // === Entry Point ===
    const init = () => {
      // Merge base config with the selected seeded config
      const cfg = { ...BASE_CFG, ...(SEED_CONFIGS[SEED % SEED_CONFIGS.length] || {}) };
  
      // Get DOM elements
      const cvs = document.getElementById("hud-canvas");
      const helmet = document.getElementById("helmet-overlay");
  
      // Exit if essential elements are not found
      if (!cvs || !helmet) {
        console.warn("HUD Visualizer disabled: #hud-canvas or #helmet-overlay not found in DOM.");
        return;
      }
  
      const ctx = cvs.getContext("2d", { alpha: true });
      const noise = document.createElement("canvas");
      const nCtx = noise.getContext("2d", { willReadFrequently: true });
      
      const geom = { helmet: {}, visor: {} };
      const state = {};
  
      updateGeometry(geom, cvs);
  
      // Sync with the main fx-visualizer's global playback state
      // This uses a getter to always have the current state.
      const playbackState = {
        get isPlaying() {
          return window.fxPlaybackState ? window.fxPlaybackState.isPlaying : false;
        }
      };
      
      // Set initial opacity based on playback state
      setupAnimationState(playbackState.isPlaying, state, helmet, cvs);
  
      // Create the main drawing function
      const draw = createRenderLoop(ctx, cvs, geom, cfg, noise, nCtx);
  
      // Start the animation frame loop
      let lastKnownPlayingState = playbackState.isPlaying;
      function frame(t) {
        // Only run setup state logic when playback status changes
        if (playbackState.isPlaying !== lastKnownPlayingState) {
            setupAnimationState(playbackState.isPlaying, state, helmet, cvs);
            lastKnownPlayingState = playbackState.isPlaying;
        }
  
        draw(t);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    };
  
    // Run the initializer once the DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
  })();