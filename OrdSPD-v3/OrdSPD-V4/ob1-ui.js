/*  OB1 Universal Control Panel
    -------------------------------------------------
    import 'ob1-ui.js' once and it self-mounts
    at the bottom of <body>.  Works with or without
    an OB1 <iframe>.
*/

const OB1_UI = (() => {
    /* ---------- 1. CONFIG -------------------------------------------------- */
    const BPM_MIN   = 60;
    const BPM_MAX   = 240;
    const VOL_MIN   = 0;
    const VOL_MAX   = 2;
    const VOL_STEP  = 0.05;
    const SPD_MIN   = 0.2;
    const SPD_MAX   = 100;
  
    /* ---------- 2. HELPERS ------------------------------------------------- */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  
    /* ---------- 3. DISCOVER OB1 TARGET ------------------------------------ */
    // Prefer iframe with id="ob1-frame", else current window
    const ob1Frame = $('#ob1-frame');
    const targetWindow = ob1Frame ? ob1Frame.contentWindow : window;
    const post = (type, data = {}) => {
      targetWindow.postMessage({ type, data }, '*');
    };
  
    /* ---------- 4. CREATE UI ---------------------------------------------- */
    function buildUI() {
      const panel = document.createElement('div');
      panel.id = 'ob1-panel';
      panel.innerHTML = `
        <style>
          :root {
            --bg: #111;
            --fg: #fff;
            --accent: #fffb00;
            --btn: #222;
            --btn-on: #444;
          }
          #ob1-panel {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: var(--bg);
            color: var(--fg);
            font-family: system-ui, sans-serif;
            padding: .5rem;
            display: flex;
            flex-wrap: wrap;
            gap: .5rem;
            justify-content: center;
            z-index: 9999;
            user-select: none;
          }
          #ob1-panel > label {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: .75rem;
          }
          #ob1-panel button, #ob1-panel input[type=range] {
            touch-action: manipulation;
          }
          #ob1-panel button {
            background: var(--btn);
            border: none;
            color: var(--fg);
            padding: .4rem .6rem;
            border-radius: .3rem;
            cursor: pointer;
            min-width: 3rem;
          }
          #ob1-panel button.active { background: var(--accent); color: #000; }
          #ob1-panel input[type=range] {
            width: 100%;
            max-width: 120px;
          }
          @media (max-width: 600px) {
            #ob1-panel { flex-direction: column; align-items: stretch; }
          }
        </style>
  
        <!-- Transport -->
        <button id="btn-loop"  data-action="playLoop">LOOP</button>
        <button id="btn-once"  data-action="playOnce">ONCE</button>
  
        <!-- BPM -->
        <label>
          BPM
          <input type="range" id="range-bpm" min="${BPM_MIN}" max="${BPM_MAX}" value="78" step="1">
          <span id="val-bpm">78</span>
        </label>
  
        <!-- Multiplier -->
        <label>
          Loop length
          <input type="range" id="range-mult" min="0" max="15" value="4" step="1">
          <span id="val-mult">1 beat</span>
        </label>
  
        <!-- Speed -->
        <label>
          Speed
          <input type="range" id="range-speed" min="${SPD_MIN}" max="${SPD_MAX}" value="1" step="0.01">
          <span id="val-speed">1.00×</span>
        </label>
  
        <!-- Volume -->
        <label>
          Volume
          <input type="range" id="range-vol" min="${VOL_MIN}" max="${VOL_MAX}" value="1" step="${VOL_STEP}">
          <button id="btn-mute">🔊</button>
        </label>
      `;
      document.body.appendChild(panel);
      return panel;
    }
  
    /* ---------- 5. MULTIPLIER STEPS & LABELS ------------------------------ */
    const multSteps = [16, 8, 4, 2, 1, .5, .25, .125, .0625, .03125, .015625,
                       .0078125, .00390625, .001953125, .0009765625, .00048828125];
    const multLabels = { 16: '1/16', 8: '1/8', 4: '1/4', 2: '1/2', 1: '1 beat',
                         .5: '2 beats', .25: '1 bar', .125: '2 bars', .0625: '4 bars',
                         .03125: '8 bars', .015625: '16 bars', .0078125: '32 bars',
                         .00390625: '64 bars', .001953125: '128 bars',
                         .0009765625: '256 bars', .00048828125: '512 bars' };
  
    /* ---------- 6. WIRE CONTROLS ------------------------------------------ */
    function wire() {
      const p = $('#ob1-panel');
  
      /* Transport buttons */
      p.addEventListener('click', e => {
        if (e.target.dataset.action) {
          const act = e.target.dataset.action;
          if (act === 'playLoop') {
            post('playLoop');
            e.target.classList.toggle('active');
          } else if (act === 'playOnce') {
            post('playOnce');
          }
        }
      });
  
      /* BPM slider */
      $('#range-bpm').addEventListener('input', e => {
        const v = +e.target.value;
        $('#val-bpm').textContent = v;
        post('updateBPM', { bpm: v });
      });
  
      /* Multiplier slider */
      $('#range-mult').addEventListener('input', e => {
        const idx = +e.target.value;
        const val = multSteps[idx];
        $('#val-mult').textContent = multLabels[val] || `${val}`;
        post('setMultiplier', { multiplier: val });
      });
  
      /* Speed slider */
      $('#range-speed').addEventListener('input', e => {
        const v = +e.target.value;
        $('#val-speed').textContent = v.toFixed(2) + '×';
        post('playAtSpeed', { speed: v });
      });
  
      /* Volume slider + mute */
      const volSlider = $('#range-vol');
      const muteBtn   = $('#btn-mute');
      volSlider.addEventListener('input', e => {
        const v = +e.target.value;
        muteBtn.textContent = v === 0 ? '🔇' : '🔊';
        post('setVolume', { volume: v });
      });
      muteBtn.addEventListener('click', () => {
        const muted = muteBtn.textContent === '🔇';
        post('muteControl', { mute: !muted });
        muteBtn.textContent = !muted ? '🔇' : '🔊';
        if (!muted) volSlider.value = 0;
        else        volSlider.value = 1; // restore sensible default
      });
    }
  
    /* ---------- 7. BOOTSTRAP ---------------------------------------------- */
    function init() {
      if ($('#ob1-panel')) return; // already injected
      buildUI();
      wire();
    }
  
    /* auto-start when script is loaded */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    /* ---------- 8. EXPORT (optional) -------------------------------------- */
    return { init };
  })();
  
  /* ES-module auto-executes.  Export still available for programmatic use */
  export default OB1_UI;