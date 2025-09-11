// js/keyboard-page.js
import { Engine } from './engine.js';
import { KeyboardUI } from './keyboard.js'; // <-- MAKE SURE THIS FILE EXISTS

const seed = document.documentElement.dataset.seed || 'aabbccdd';
document.getElementById('seedText').textContent = seed;

const app = {
  humKey: 'hum',
  _canvas: {
    listShapes(){
      return [
        'circle','square','butterfly','Bowditch','spiro','harmonograph','rose',
        'hypocycloid','epicycloid','spiral','star','flower','wave','mandala',
        'infinity','dna','tornado'
      ];
    }
  },
  _loader: { textContent: '' },
  _sequencerComponent: { style: {} },
  _main: { style: {} },
  _updateControls(){},
  _sleep: ms => new Promise(r=>setTimeout(r,ms)),
  state: {},
  defaultState(seedStr){ return {
    seed: seedStr, Tone: window.Tone, chains: {}, presets: {},
    current: null, isMuted:false, isPlaying:false, contextUnlocked:false,
    initialBufferingStarted:false, initialShapeBuffered:false, volume:0.8, approvedSeeds:[]
  }; }
};

const engine   = Engine(app);
const startBtn = document.getElementById('startBtn');
const statusEl = document.getElementById('status');
const bankEl   = document.getElementById('bank');

let currentKey = null;

// ---------- Patch head helpers ----------
const $ = id => document.getElementById(id);
const linkPair = (range, num, getter, setter) => {
  const sync = v => { range.value = v; num.value = v; };
  range.addEventListener('input', e => setter(parseFloat(e.target.value)));
  num.addEventListener('change', e => setter(parseFloat(e.target.value)));
  return { set: v => sync(getter(v)) };
};

function loadHeadFromPatch(p) {
  if (!p) return;
  $('osc1_type').value = p.osc1.type;
  $('osc2_enabled').checked = !!p.osc2.enabled;
  $('osc2_type').value = p.osc2.type;
  $('osc2_type').disabled = !$('osc2_enabled').checked;
  $('filter_freq').value = $('filter_freq_num').value = p.filter.freq;
  $('filter_q').value    = $('filter_q_num').value    = p.filter.Q;
  $('env_a').value = $('env_a_num').value = p.envelope.attack;
  $('env_d').value = $('env_d_num').value = p.envelope.decay;
  $('env_s').value = $('env_s_num').value = p.envelope.sustain;
  $('env_r').value = $('env_r_num').value = p.envelope.release;
  $('lfo_rate').value = $('lfo_rate_num').value = p.lfo.rate;
  $('lfo_min').value  = $('lfo_min_num').value  = p.lfo.min;
  $('lfo_max').value  = $('lfo_max_num').value  = p.lfo.max;
}

function bindHead() {
  $('osc1_type').addEventListener('change', e => engine.setParam('osc1.type', e.target.value));
  $('osc2_enabled').addEventListener('change', e => {
    $('osc2_type').disabled = !e.target.checked;
    engine.setParam('osc2.enabled', e.target.checked);
  });
  $('osc2_type').addEventListener('change', e => engine.setParam('osc2.type', e.target.value));
  linkPair($('filter_freq'), $('filter_freq_num'), v=>v, v => engine.setParam('filter.freq', v));
  linkPair($('filter_q'),    $('filter_q_num'),    v=>v, v => engine.setParam('filter.Q',    v));
  linkPair($('env_a'), $('env_a_num'), v=>v, v => engine.setParam('envelope.attack', v));
  linkPair($('env_d'), $('env_d_num'), v=>v, v => engine.setParam('envelope.decay',  v));
  linkPair($('env_s'), $('env_s_num'), v=>v, v => engine.setParam('envelope.sustain',v));
  linkPair($('env_r'), $('env_r_num'), v=>v, v => engine.setParam('envelope.release',v));
  linkPair($('lfo_rate'), $('lfo_rate_num'), v=>v, v => engine.setParam('lfo.rate', v));
  linkPair($('lfo_min'),  $('lfo_min_num'),  v=>v, v => engine.setParam('lfo.min',  v));
  linkPair($('lfo_max'),  $('lfo_max_num'),  v=>v, v => engine.setParam('lfo.max',  v));
}

engine.onPatchChange((shape, patch) => {
  if (shape === currentKey) loadHeadFromPatch(patch);
});

// ---------- Bank ----------
function renderBank() {
  bankEl.innerHTML = '';
  const keys = Object.keys(app.state.presets || {});
  keys.forEach((k) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = k;
    btn.dataset.key = k;
    if (k === currentKey) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentKey = k;
      engine.setInstrumentSilent(k);
      [...bankEl.children].forEach(c => c.classList.toggle('active', c.dataset.key === k));
      loadHeadFromPatch(engine.getPatch(k));
    });
    bankEl.appendChild(btn);
  });
}

// ---------- Audio boot + init ----------
async function init(){
  app.state = app.defaultState(seed);
  engine.loadPresets(seed);
  currentKey = Object.keys(app.state.presets)[0] || null;
  renderBank();

  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';
  try {
    await engine.unlockAudioAndBufferInitial(currentKey || app.humKey);
    statusEl.textContent = 'Ready. Select a sound, then play.';
    startBtn.textContent = 'Audio Active';
    if (currentKey) engine.setInstrumentSilent(currentKey);
    loadHeadFromPatch(engine.getPatch(currentKey));
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Unable to start audio. See console.';
    startBtn.disabled = false;
    startBtn.textContent = 'Click to Start Audio';
  }
}

startBtn.addEventListener('click', () => {
  if (!window.Tone) return;
  init();
}, { once:true });

document.getElementById('toneLoader').addEventListener('tone-ready', () => {
  statusEl.textContent = 'Audio engine ready. Click "Start" to begin.';
  startBtn.disabled = false;
  startBtn.textContent = 'Click to Start Audio';
});

// ---------- Initialize Components ----------

// Use the new KeyboardUI component instead of the old inline function
new KeyboardUI('keyboard-container', engine);

// Bind head controls once
bindHead();