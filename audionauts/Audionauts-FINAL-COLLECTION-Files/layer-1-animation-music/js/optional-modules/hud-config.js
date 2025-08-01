// js/hud-config.js

(() => {
    // === Configuration Constants ===
    const SEED = 0; // Selects the default configuration from the array below
    const BASE_CFG = {
      sineWave: false,
      ecg: true,
      flashing: false,
      text: "AUDIONAUTS",
      fontSize: 28
    };
  
    // === Text Generation Helpers ===
    const autoSpeed = (step, chars, bar = 9.22, div = 1) => step * chars / (bar / div);
    const genBin = len => [...Array(len)].map(() => Math.random() < .5 ? 0 : 1).join('');
    const genHex = len => [...Array(len)].map((_, i) => i.toString(16).padStart(2, '0')).join(' ');
  
    // === Array of Pre-defined Visualizer Configurations ===
    const SEED_CONFIGS = [{},
      { name: "Emergency Broadcast – Rebellion Call", text: "⚠️ ALERT // DSP TITANS ADVANCING // TAKE BACK THE AIRWAVES ⚠️", color: "rgba(255,0,0,0.7)", fontSize: 26, step: 28, speed: autoSpeed(28, 57), flashing: true, flashSync: true, flashBeats: 1, flashSyncBPM: 104.15, flashDivision: 1 },
      { name: "On-Chain Cipher", text: "01000001 01110101 01100100 01101001 01101111 00100000 01010110 01101001 01100100 01100101 00100000", color: "rgba(0,255,80,0.4)", font: '"Fira Code",monospace', fontSize: 24, step: 26, speed: autoSpeed(26, 99), glitch: 0.8 },
      { name: "Rainbow Rave Anthem", text: "⛓️ UNCHAIN 🪩 THE 🪩 SOUND 🎶 RETAKE 🪩 THE 🪩 FEED  ", fontSize: 34, step: 36, speed: 40, rainbow: true, depth: 0.1 },
      { name: "Encrypted Whispers", text: "...gatekeeper static fading... pros reclaiming stems... hold the swing...", color: "rgba(200,220,255,0.15)", fontSize: 22, step: 24, speed: autoSpeed(24, 70), glitch: 1.5, depth: 0.1 },
      { name: "Sonic Freedom Wave (sine)", sineWave: true, color: "rgba(255,60,60,0.5)", fontSize: 20, step: 22, speed: autoSpeed(22, 10, 9.22, 2), amplitude: 20, frequency: 0.25, lineWidth: 2, depth: 0.1 },
      { name: "ECG – Beat of Revolution", ecg: true, heartbeatSpeed: 0.5, peakOnBeat: true, color: "rgba(255,100,100,0.7)", speed: 0.25, amplitude: 45, cycleWidth: 250, lineWidth: 2, depth: 0.1 },
      { name: "Golden Block Confirmed", text: "SYSTEMS GREEN ✅ PRO PAY ROUTED ✅ BLOCK FINALIZED ", color: "rgba(255,215,0,0.4)", font: '"Times New Roman",serif', fontSize: 24, step: 26, speed: autoSpeed(26, 52) },
      { name: "Minimal Pulse", text: "::::::::::::::::::::::::::::::::::::::::::::::::", color: "rgba(100,100,100,0.1)", fontSize: 40, step: 42, speed: autoSpeed(42, 48), depth: 0.1 },
      { name: "Audionaut Dispatch", text: "🚀 AUDIONAUT // PRO NODE ONLINE – OWN YOUR MIX 🎧 ", color: "rgba(0,255,255,0.25)", font: '"Courier New",monospace', fontSize: 28, step: 30, speed: 78, depth: 0.1, effect: "none" },
      { name: "Celestial Harmony Rain", text: "🌌🔗🎧💎🎼🪐🚀🎶✨", fontSize: 36, step: 40, speed: autoSpeed(40, 9, 9.22, 2), color: "rgba(255,200,0,0.5)", font: '"Segoe UI Emoji",sans-serif', depth: 0.1, effect: "emojiRain" },
      { name: "Critical Rhythm Warning", text: "!!! WARNING // ROYALTY FLOW CRITICAL !!!", color: "rgba(255,0,0,0.8)", font: '"Impact",sans-serif', fontSize: 32, step: 46, speed: 60, depth: 0.1, effect: "flash" },
      { name: "Random Ledger Stream", text: genBin(200), color: "rgba(0,255,70,0.3)", font: '"Lucida Console",monospace', fontSize: 24, step: 26, speed: autoSpeed(26, 200), depth: 0.1, effect: "matrix" },
      { name: "Blockbeat Calibration", text: "…CALIBRATING PRO RIGHTS… DISTRIBUTION NODES PURGED…", font: '"Verdana",sans-serif', fontSize: 30, step: 34, speed: 60, depth: 0.1, effect: "rainbowWave" },
      { name: "Legacy System Debug", text: "▌▌▌▌▌▌ DISMANTLING GATEKEEPERS ▌▌▌▌▌▌", color: "rgba(0,255,0,0.2)", font: '"Press Start 2P",monospace', fontSize: 20, step: 22, speed: 60, depth: 0.1, effect: "scanline" },
      { name: "Neon Refrain", text: "⚡ DIRECT-TO-CHAIN // NO MIDDLEMEN ⚡", color: "rgba(255,0,255,0.6)", font: '"Arial Black",sans-serif', fontSize: 25, step: 27, speed: autoSpeed(27, 38), depth: 0.1, effect: "pulse" },
      { name: "Stealth Sync", text: "…satellite link secured… royalties rerouted…", color: "rgba(255,255,255,0.05)", font: '"Courier New",monospace', fontSize: 28, step: 30, speed: autoSpeed(30, 50), depth: 0.1, effect: "none" },
      { name: "Diagnostic Dump", text: genHex(100), color: "rgba(100,100,255,0.3)", font: '"Courier New",monospace', fontSize: 32, step: 34, speed: autoSpeed(34, 299), depth: 0.1, effect: "glitch" },
      { name: "Matrix Override", text: "🟩 DECENTRALISE PRO MIXDOWN 🟩 ", fontSize: 26, step: 28, speed: autoSpeed(28, 30), color: "rgba(0,255,64,.33)", font: 'bold 22px "Consolas",monospace', extra: { matrix: true } },
      { name: "Synthwave Uprising", text: "👾 SYNTHWAVE UPRISING // ROYALTIES REBOOTED 🚦 ", fontSize: 24, step: 26, speed: autoSpeed(26, 44), color: "rgba(255,0,224,0.38)", font: '"Press Start 2P",monospace', extra: { shadow: "#ff00ff" } },
      { name: "Redline Burn", text: "⚠️ LEGACY CONTRACTS FOUND // AUTO-BURN START ⚠️ ", fontSize: 32, step: 36, speed: 60, color: "rgba(255,24,24,0.8)", font: '"Arial Black",Arial,sans-serif', extra: { flash: true } },
      { name: "Mission – BlockRocket", text: "🛰️ BLOCKROCKET ENGAGED – LAUNCHING PRO PAYLOAD 🌌 ", fontSize: 27, step: 29, speed: 60, color: "rgba(80,170,255,.33)", font: '"Orbitron",sans-serif', extra: { shadow: "#ffffff" } },
      { name: "Signal Jam", text: "↯ DRM STATIC NULLIFIED ↯ CHANNEL RESTORED ", fontSize: 28, step: 30, speed: 60, color: "rgba(255,40,210,.30)", font: '"JetBrains Mono",monospace', extra: { glitch: true } },
      { name: "Airlock Pulse", text: "🚨 AIRLOCK OPEN – FLOOD THE BEAT 🚨 ", fontSize: 30, step: 32, speed: autoSpeed(32, 36), color: "rgba(255,0,0,0.8)", font: '"Arial Black",Arial,sans-serif', extra: { strobe: true } },
      { name: "Royalty Relay", text: "💸 REAL-TIME SPLITS STREAMING 💸 ", fontSize: 26, step: 28, speed: autoSpeed(28, 32), color: "rgba(0,255,200,0.35)", font: '"DM Mono",monospace', extra: { glow: true } },
      { name: "Chain Choir", text: "⛓️🎶 NODE VOICES UNITED 🎶⛓️ ", fontSize: 24, step: 26, speed: autoSpeed(26, 28), color: "rgba(180,120,255,0.4)", font: '"Press Start 2P",monospace', extra: { echo: true } },
      { name: "Ledger Lantern", text: "🏮 TRANSPARENT PATH FOR PROS 🏮 ", fontSize: 28, step: 30, speed: autoSpeed(30, 32), color: "rgba(255,165,0,0.45)", font: '"Lucida Console",monospace', extra: { scroll: true } },
      { name: "Spectral Sync", text: "…multi-chain ghosts in tune…", fontSize: 28, step: 30, speed: autoSpeed(30, 30), color: "rgba(255,255,255,0.25)", font: '"Courier New",monospace', effect: "fade", depth: 0.1 },
      { name: "Neon Node Flux", text: "⚡ NODE COUNT 10K+ // THRUST MAX ⚡", fontSize: 25, step: 27, speed: autoSpeed(27, 33), color: "rgba(0,255,255,0.6)", font: '"Arial Black",sans-serif', effect: "pulse" },
      { name: "Bassline Beacon", fontSize: 31, step: 22, speed: 100, color: "rgba(0,0,0,0.75)", font: '"Impact",sans-serif', text: "🔊 FOLLOW THE BASS / 🔊 / FREEDOM FREQUENCY ", effect: "flash" },
      { name: "Bassline Beacon 2", fontSize: 31, step: 22, speed: 100, color: "rgba(0,0,0,0.75)", font: '"Impact",sans-serif', text: "🎧 SHAPE THE FUTURE /🎼/ HONOUR THE ARTISTS ", effect: "flash" },
      { name: "Ouroboros Overdrive", text: "∞ LOOP THE LOOP // SOUND ETERNAL ", fontSize: 26, step: 28, speed: autoSpeed(28, 33), color: "rgba(128,0,255,0.5)", font: '"Consolas",monospace', extra: { spin: true } }
    ];
  
    // --- Expose configurations on the window object ---
    window.HUD_CONFIGS = {
      SEED,
      BASE_CFG,
      SEED_CONFIGS
    };
  
  })();