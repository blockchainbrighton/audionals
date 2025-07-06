// === config.js ===
const ANIMATION_CONFIG = {
    helmet: { mode: "fade" },
    hud: { mode: "fade" }
  };
  const SEED = 0;
  const BASE_CFG = {
    sineWave: false,
    ecg: true,
    flashing: false,
    text: "AUDIONAUTS",
    fontSize: 28
  };
  
  // === seedConfigs.js ===
  const D_FONT = '"Arial", sans-serif', D_COLOR = "rgba(0,255,255,0.33)", D_STEP = 28;
  const autoSpeed = (step, chars, bar = 9.22, div = 1) => step * chars / (bar / div);
  const genBin = len => Array(len).fill().map(() => Math.random() < 0.5 ? "0" : "1").join('');
  const genHex = len => Array.from({length: len}, (_, i) => i.toString(16).padStart(2, '0')).join(' ');
  const SEED_CONFIGS = [
    {},
    // 1: Emergency Broadcast – Rebellion Call
    {
      name: "**Emergency Broadcast – Rebellion Call**",
      text: "⚠️ ALERT // DSP TITANS ADVANCING // TAKE BACK THE AIRWAVES ⚠️",
      color: "rgba(255,0,0,0.7)", fontSize: 26, step: 28, speed: autoSpeed(28, 57),
      flashing: true, flashSync: true, flashBeats: 1, flashSyncBPM: 104.15, flashDivision: 1
    },
    // 2: On-Chain Cipher
    {
      name: "**On-Chain Cipher**",
      text: "01000001 01110101 01100100 01101001 01101111 00100000 01010110 01101001 01100100 01100101 00100000",
      color: "rgba(0,255,80,0.4)", font: '"Fira Code", monospace', fontSize: 24, step: 26,
      speed: autoSpeed(26, 99), glitch: 0.8
    },
    // 3: Rainbow Rave Anthem
    {
      name: "**Rainbow Rave Anthem**",
      text: "⛓️ UNCHAIN 🪩 THE 🪩 SOUND 🎶 RETAKE 🪩 THE 🪩 FEED  ", fontSize: 34, step: 36,
      speed: 40, rainbow: true, depth: 0.1
    },
    // 4: Encrypted Whispers
    {
      name: "**Encrypted Whispers**",
      text: "...gatekeeper static fading... pros reclaiming stems... hold the swing...",
      color: "rgba(200,220,255,0.15)", fontSize: 22, step: 24,
      speed: autoSpeed(24, 70), glitch: 1.5, depth: 0.1
    },
    // 5: Sonic Freedom Wave (sine)
    {
      name: "**Sonic Freedom Wave**",
      sineWave: true, color: "rgba(255,60,60,0.5)", fontSize: 20, step: 22,
      speed: autoSpeed(22, 10, 9.22, 2), amplitude: 20, frequency: 0.25, lineWidth: 2, depth: 0.1
    },
    // 6: ECG – Beat of Revolution
    {
      name: "**ECG – Beat of Revolution**",
      ecg: true, heartbeatSpeed: 0.5, peakOnBeat: true, color: "rgba(255,100,100,0.7)",
      speed: 0.25, amplitude: 45, cycleWidth: 250, lineWidth: 2, depth: 0.1
    },
    // 7: Golden Block Confirmed
    {
      name: "**Golden Block Confirmed**",
      text: "SYSTEMS GREEN ✅ PRO PAY ROUTED ✅ BLOCK FINALIZED ",
      color: "rgba(255,215,0,0.4)", font: '"Times New Roman", serif', fontSize: 24, step: 26,
      speed: autoSpeed(26, 52)
    },
    // 8: Minimal Pulse
    {
      name: "**Minimal Pulse**",
      text: "::::::::::::::::::::::::::::::::::::::::::::::::",
      color: "rgba(100,100,100,0.1)", fontSize: 40, step: 42,
      speed: autoSpeed(42, 48), depth: 0.1
    },
    // 9: Audionaut Dispatch
    {
      name: "**Audionaut Dispatch**",
      text: "🚀 AUDIONAUT // PRO NODE ONLINE – OWN YOUR MIX 🎧 ",
      color: "rgba(0,255,255,0.25)", font: '"Courier New", monospace', fontSize: 28, step: 30,
      speed: 78, depth: 0.1, effect: "none"
    },
    // 10: Celestial Harmony Rain
    {
      name: "**Celestial Harmony Rain**",
      text: "🌌🔗🎧💎🎼🪐🚀🎶✨", fontSize: 36, step: 40, speed: autoSpeed(40, 9, 9.22, 2),
      color: "rgba(255,200,0,0.5)", font: '"Segoe UI Emoji", sans-serif', depth: 0.1, effect: "emojiRain"
    },
    // 11: Critical Rhythm Warning
    {
      name: "**Critical Rhythm Warning**",
      text: "!!! WARNING // ROYALTY FLOW CRITICAL !!!",
      color: "rgba(255,0,0,0.8)", font: '"Impact", sans-serif', fontSize: 32, step: 46,
      speed: 60, depth: 0.1, effect: "flash"
    },
    // 12: Random Ledger Stream
    {
      name: "**Random Ledger Stream**",
      text: genBin(200), color: "rgba(0,255,70,0.3)", font: '"Lucida Console", monospace',
      fontSize: 24, step: 26, speed: autoSpeed(26, 200), depth: 0.1, effect: "matrix"
    },
    // 13: Blockbeat Calibration
    {
      name: "**Blockbeat Calibration**",
      text: "…CALIBRATING PRO RIGHTS… DISTRIBUTION NODES PURGED…",
      font: '"Verdana", sans-serif', fontSize: 30, step: 34,
      speed: 60, depth: 0.1, effect: "rainbowWave"
    },
    // 14: Legacy System Debug
    {
      name: "**Legacy System Debug**",
      text: "▌▌▌▌▌▌ DISMANTLING GATEKEEPERS ▌▌▌▌▌▌",
      color: "rgba(0,255,0,0.2)", font: '"Press Start 2P", monospace', fontSize: 20, step: 22,
      speed: 60, depth: 0.1, effect: "scanline"
    },
    // 15: Neon Refrain
    {
      name: "**Neon Refrain**",
      text: "⚡ DIRECT-TO-CHAIN // NO MIDDLEMEN ⚡",
      color: "rgba(255,0,255,0.6)", font: '"Arial Black", sans-serif', fontSize: 25, step: 27,
      speed: autoSpeed(27, 38), depth: 0.1, effect: "pulse"
    },
    // 16: Stealth Sync
    {
      name: "**Stealth Sync**",
      text: "…satellite link secured… royalties rerouted…",
      color: "rgba(255,255,255,0.05)", font: '"Courier New", monospace', fontSize: 28, step: 30,
      speed: autoSpeed(30, 50), depth: 0.1, effect: "none"
    },
    // 17: Diagnostic Dump
    {
      name: "**Diagnostic Dump**",
      text: genHex(100), color: "rgba(100,100,255,0.3)", font: '"Courier New", monospace',
      fontSize: 32, step: 34, speed: autoSpeed(34, 299), depth: 0.1, effect: "glitch"
    },
    // 18: Matrix Override
    {
      name: "**Matrix Override**",
      text: "🟩 DECENTRALISE PRO MIXDOWN 🟩 ", fontSize: 26, step: 28,
      speed: autoSpeed(28, 30), color: "rgba(0,255,64,.33)",
      font: 'bold 700 22px "Consolas", monospace', extra: { matrix: true }
    },
    // 19: Synthwave Uprising
    {
      name: "**Synthwave Uprising**",
      text: "👾 SYNTHWAVE UPRISING // ROYALTIES REBOOTED 🚦 ", fontSize: 24, step: 26,
      speed: autoSpeed(26, 44), color: "rgba(255,0,224,0.38)", font: '"Press Start 2P", monospace',
      extra: { shadow: "#ff00ff" }
    },
    // 20: Redline Burn
    {
      name: "**Redline Burn**",
      text: "⚠️ LEGACY CONTRACTS FOUND // AUTO-BURN START ⚠️ ", fontSize: 32, step: 36,
      speed: 60, color: "rgba(255,24,24,0.8)", font: '"Arial Black", Arial, sans-serif',
      extra: { flash: true }
    },
    // 21: Mission – BlockRocket
    {
      name: "**Mission – BlockRocket**",
      text: "🛰️ BLOCKROCKET ENGAGED – LAUNCHING PRO PAYLOAD 🌌 ", fontSize: 27, step: 29,
      speed: 60, color: "rgba(80,170,255,.33)", font: '"Orbitron", sans-serif',
      extra: { shadow: "#ffffff" }
    },
    // 22: Signal Jam
    {
      name: "**Signal Jam**",
      text: "↯ DRM STATIC NULLIFIED ↯ CHANNEL RESTORED ", fontSize: 28, step: 30,
      speed: 60, color: "rgba(255,40,210,.30)", font: '"JetBrains Mono", monospace',
      extra: { glitch: true }
    },
    // 23: Airlock Pulse
    {
      name: "**Airlock Pulse**",
      text: "🚨 AIRLOCK OPEN – FLOOD THE BEAT 🚨 ", fontSize: 30, step: 32,
      speed: autoSpeed(32, 36), color: "rgba(255,0,0,0.8)", font: '"Arial Black", Arial, sans-serif',
      extra: { strobe: true }
    },
    // 24: Royalty Relay
    {
      name: "**Royalty Relay**",
      text: "💸 REAL-TIME SPLITS STREAMING 💸 ", fontSize: 26, step: 28,
      speed: autoSpeed(28, 32), color: "rgba(0,255,200,0.35)", font: '"DM Mono", monospace',
      extra: { glow: true }
    },
    // 25: Chain Choir
    {
      name: "**Chain Choir**",
      text: "⛓️🎶 NODE VOICES UNITED 🎶⛓️ ", fontSize: 24, step: 26,
      speed: autoSpeed(26, 28), color: "rgba(180,120,255,0.4)", font: '"Press Start 2P", monospace',
      extra: { echo: true }
    },
    // 26: Ledger Lantern
    {
      name: "**Ledger Lantern**",
      text: "🏮 TRANSPARENT PATH FOR PROS 🏮 ", fontSize: 28, step: 30,
      speed: autoSpeed(30, 32), color: "rgba(255,165,0,0.45)", font: '"Lucida Console", monospace',
      extra: { scroll: true }
    },
    // 27: Spectral Sync
    {
      name: "**Spectral Sync**",
      text: "…multi-chain ghosts in tune…", fontSize: 28, step: 30,
      speed: autoSpeed(30, 30), color: "rgba(255,255,255,0.25)", font: '"Courier New", monospace',
      effect: "fade", depth: 0.1
    },
    // 28: Neon Node Flux
    {
      name: "**Neon Node Flux**",
      text: "⚡ NODE COUNT 10K+ // THRUST MAX ⚡", fontSize: 25, step: 27,
      speed: autoSpeed(27, 33), color: "rgba(0,255,255,0.6)", font: '"Arial Black", sans-serif',
      effect: "pulse"
    },
    // 29: Bassline Beacon
    {
      name: "**Bassline Beacon**",
      fontSize: 31, step: 22, speed: 100, color: "rgba(0,0,0,0.75)", font: '"Impact", sans-serif',
      text: "🔊 FOLLOW THE BASS / 🔊 / FREEDOM FREQUENCY ", effect: "flash"
    },
    // 30: Bassline Beacon 2
    {
      name: "**Bassline Beacon**",
      fontSize: 31, step: 22, speed: 100, color: "rgba(0,0,0,0.75)", font: '"Impact", sans-serif',
      text: "🎧 SHAPE THE FUTURE /🎼/ HONOUR THE ARTISTS ", effect: "flash"
    },
    // 31: Ouroboros Overdrive
    {
      name: "**Ouroboros Overdrive**",
      text: "∞ LOOP THE LOOP // SOUND ETERNAL ", fontSize: 26, step: 28,
      speed: autoSpeed(28, 33), color: "rgba(128,0,255,0.5)", font: '"Consolas", monospace',
      extra: { spin: true }
    }
  ];
  
  // === state.js ===
  const PLAYBACK_STATE = { isPlaying: false };
  
  // === geometry.js ===
  function updateGeometry(geom, cvs) {
    // Simplified: update helmet/visor geometry
    geom.helmet = { x: 10, y: 10, w: 100, h: 40 };
    geom.visor = { x: 20, y: 20, w: 80, h: 30 };
  }
  
  // === grain.js ===
  function grain(ctx, geom, noise, nCtx, CFG) {
    const { w, h } = geom.visor;
    noise.width = w; noise.height = h;
    const o = nCtx.getImageData(0, 0, w, h);
    const alpha = CFG.flashing ? 40 : 18;
    for (let i = 0; i < o.data.length; i += 4) {
      const gray = Math.random() * 255 | 0;
      o.data[i] = o.data[i + 1] = o.data[i + 2] = gray;
      o.data[i + 3] = alpha;
    }
    nCtx.putImageData(o, 0, 0);
    nCtx.save();
    nCtx.globalCompositeOperation = "destination-in";
    nCtx.beginPath();
    nCtx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    nCtx.fill();
    nCtx.restore();
    ctx.drawImage(noise, geom.visor.x, geom.visor.y);
  }
  
  // === curve.js ===
  function curve(ctx, x, y, width, height) {
    ctx.moveTo(x, y + height / 2);
    ctx.bezierCurveTo(x + width / 3, y, x + 2 * width / 3, y + height, x + width, y + height / 2);
  }
  
  // === fade.js ===
  function checkAndTriggerFade(state, cfg) {
    // Dummy fade effect; fill out as needed.
    if (cfg.fade) state.fading = true;
  }
  
  // === heartbeat.js ===
  const HEARTBEAT_SETTINGS = { bpm: 104.15 };
  function beep() {
    // Simple beep with AudioContext, replace with your preferred method
    if (typeof AudioContext !== "undefined") {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      osc.onended = () => ctx.close();
    }
  }
  function initECG() {
    // Setup ECG line state here
    return { beats: [], lastTime: 0 };
  }
  
  // === flashUtils.js ===
  function isFlashOn(state) {
    return !!state.flashing;
  }
  
  // === setupState.js ===
  function setupAnimationState(isPlaying, animationState, helmet, cvs) {
    animationState.startTime = isPlaying ? performance.now() : 0;
    animationState.helmet = { fadeInTriggered: 0, fadeOutTriggered: 0 };
    animationState.hud = { fadeInTriggered: 0, fadeOutTriggered: 0 };
    for (const [key, el] of Object.entries({ helmet, hud: cvs })) {
      const mode = ANIMATION_CONFIG[key]?.mode;
      if (!el) continue;
      el.style.transition = 'none';
      el.style.opacity = isPlaying
        ? (mode === 'fade' ? '0' : mode === 'visible' ? '1' : '0')
        : mode === 'hidden' ? '0' : '1';
    }
  }
  
  // === loop.js ===
  function loop(
    ctx, cvs, geom, CFG, chars, helmet, noise, nCtx,
    animationState, lastHeartbeatTimeRef, lastTimeRef, pxOffsetRef, charShiftRef
  ) {
    return function _loop(t) {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      const o = geom.visor;
      ctx.save(); ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, 2 * Math.PI); ctx.clip();
  
      if (CFG.sineWave) {
        // Sine wave drawing logic here (if needed)
      } else if (CFG.ecg) {
        // ECG logic (simplified placeholder)
        if (PLAYBACK_STATE.isPlaying) {
          ctx.strokeStyle = "#0ff";
          ctx.beginPath();
          curve(ctx, o.x, o.y, o.w, o.h);
          ctx.stroke();
        }
      }
      ctx.restore();
  
      // Optionally draw grain effect
      if (CFG.flashing) grain(ctx, geom, noise, nCtx, CFG);
  
      // Fade/flash effects, etc.
      checkAndTriggerFade(animationState, CFG);
    }
  }
  
  // === index.js (Entry Point) ===
  (function () {
    const chosenSeed = SEED_CONFIGS[SEED % SEED_CONFIGS.length] || {},
      CFG = { ...BASE_CFG, ...chosenSeed },
      cvs = document.getElementById("hud-canvas"),
      ctx = cvs.getContext("2d", { alpha: true }),
      noise = document.createElement("canvas"),
      nCtx = noise.getContext("2d", { willReadFrequently: true }),
      helmet = document.getElementById("helmet-overlay"),
      chars = [...CFG.text],
      geom = { helmet: {}, visor: {} },
      animationState = {},
      lastHeartbeatTimeRef = { value: 0 },
      lastTimeRef = { value: performance.now() },
      pxOffsetRef = {},
      charShiftRef = {};
  
    updateGeometry(geom, cvs);
    setupAnimationState(false, animationState, helmet, cvs);
  
    // Main loop example, e.g. for requestAnimationFrame
    const drawLoop = loop(ctx, cvs, geom, CFG, chars, helmet, noise, nCtx,
                          animationState, lastHeartbeatTimeRef, lastTimeRef, pxOffsetRef, charShiftRef);
  
    function frame(t) {
      drawLoop(t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  
    // Expose public API (optional)
    window.AudionautHUD = {
      loop, grain, updateGeometry, setupAnimationState, PLAYBACK_STATE, beep, initECG
    };
  })();
  