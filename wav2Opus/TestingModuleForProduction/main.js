// --- main.js ---
import * as audio from './audio-processing/main.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { buildLayout, initReferencePanel } from './layout.js';
import { clamp, _isInputFocused, addListener, createElement, PITCH_SLIDER_CONFIG, sValToP } from './utils.js';

const D = {
  tempo: 78, pitch: PITCH_SLIDER_CONFIG.NEUTRAL_S, minPitch: PITCH_SLIDER_CONFIG.MIN_S, maxPitch: PITCH_SLIDER_CONFIG.MAX_S,
  pitchStep: PITCH_SLIDER_CONFIG.STEP, volume: 1, mult: 1, minTempo: 1, maxTempo: 400, minVolume: 0, maxVolume: 1.5,
  minMult: 1, maxMult: 8, imageMime: 'image/jpeg', audioMime: 'audio/opus',
};

let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
  tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
  controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
  midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;

const idMap = [
  ['app',    el => appContainer = document.getElementById(el)],
  ['main-image', el => mainImage = document.getElementById(el)],
  ['play-once-btn', el => playOnceBtn = document.getElementById(el)],
  ['loop-toggle-btn', el => loopToggleBtn = document.getElementById(el)],
  ['reverse-toggle-btn', el => reverseToggleBtn = document.getElementById(el)],
  ['tempo-slider', el => tempoSlider = document.getElementById(el)],
  ['pitch-slider', el => pitchSlider = document.getElementById(el)],
  ['volume-slider', el => volumeSlider = document.getElementById(el)],
  ['multiplier-slider', el => multiplierSlider = document.getElementById(el)],
  ['controls-container', el => controlsContainer = document.getElementById(el)],
  ['info-toggle-btn', el => infoToggleBtn = document.getElementById(el)],
  ['reference-panel', el => referencePanel = document.getElementById(el)],
  ['error-message', el => errorMessageDiv = document.getElementById(el)],
  ['midi-device-select', el => midiDeviceSelect = document.getElementById(el)],
  ['midi-status', el => midiStatusSpan = document.getElementById(el)],
  ['.controls-column', sel => controlsColumn = document.querySelector(sel)],
  ['.reference-column', sel => referenceColumn = document.querySelector(sel)],
];

const findElements = () => {
  idMap.forEach(([sel, setter]) => setter(sel));
  if (!appContainer || !controlsContainer || !errorMessageDiv || !mainImage || !controlsColumn) {
    (document.getElementById('app') ?? document.body).innerHTML = '<p style="color:red;padding:20px;">Fatal Error: Missing UI</p>';
    return false;
  }
  return true;
};

const validateBase64 = (data, prefix, name) => {
  if (!data || typeof data !== 'string' || data.startsWith('/*')) throw new Error(`Missing or invalid ${name}`);
  return data.startsWith('data:') ? data : prefix + data;
};

const handleSliderInput = (e, setAudio, updateUI, parser = parseFloat, toUI = null) => {
  const s = e.target, raw = parser(s.value), min = parser(s.min), max = parser(s.max);
  if ([raw, min, max].some(isNaN)) return;
  const v = clamp(raw, min, max); setAudio(v); updateUI(toUI ? toUI(v) : v);
};

const handleLoopToggle = async () => {
  await audio.resumeContext();
  audio.getLoopingState() ? audio.stopLoop() : audio.startLoop();
  ui.updateLoopButton(audio.getLoopingState());
};

const toggleSideColumns = () => { controlsColumn.classList.toggle('hidden'); referenceColumn?.classList.toggle('hidden'); };

const handleNoteOn = (note, vel) => {
  const rate = audio.getPlaybackRateForNote(note);
  if (rate) audio.playSampleAtRate(rate, vel);
};

const handleMidiStateChange = ({ status, message, devices, selectedDeviceId }) => {
  if (!midiDeviceSelect || !midiStatusSpan) return;
  midiStatusSpan.textContent = message || status;
  midiStatusSpan.style.color = /error|unsupported|unavailable/.test(status) ? 'var(--error-color)' : '';
  midiDeviceSelect.innerHTML = '';
  const ph = createElement('option', { value: '', textContent: status === 'ready' ? '-- Select MIDI Device --' : '-- MIDI Unavailable --', disabled: true });
  midiDeviceSelect.appendChild(ph);
  if (status === 'ready' && devices?.length) {
    midiDeviceSelect.disabled = false;
    ph.disabled = false;
    devices.forEach(d => midiDeviceSelect.appendChild(createElement('option', { value: d.id, textContent: d.name })));
    midiDeviceSelect.value = selectedDeviceId ?? '';
    midiStatusSpan.textContent = selectedDeviceId && devices.find(d => d.id === selectedDeviceId)
      ? `Connected: ${devices.find(d => d.id === selectedDeviceId).name}`
      : 'MIDI devices available.';
  } else midiDeviceSelect.disabled = true;
};

const loadDataSrc = async (g, keys, mime, label) => {
  for (const k of keys) try { if (g[k]) return validateBase64(g[k], `data:${mime};base64,`, `${label} '${k}'`); } catch {}
  return null;
};

const fetchAudioFromUrl = async (url, defMime) => {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || defMime, buf = await r.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:${ct};base64,${b64}`;
  } catch (e) { ui.showError(`Failed to load audio from URL '${url}': ${e.message}`); console.error("Audio fetch error:", e); return null; }
};

const initializeApp = async () => {
  if (!findElements()) return;
  ui.init?.(); ui.clearError();
  const g = window, im = D.imageMime, am = D.audioMime;
  let imgSrc = await loadDataSrc(g, ['audionalVisualBase64', 'imageScript'], im, 'image data') ??
    (typeof g.imageURL === 'string' && !g.imageURL.startsWith('/*') && g.imageURL.trim() !== '' ? g.imageURL : null);
  if (!imgSrc) { ui.showError("No image data source found."); ui.setImageSource(null); } else ui.setImageSource(imgSrc);
  let audSrc = await loadDataSrc(g, ['audionalBase64_Opus', 'audioScript'], am, 'audio data') ??
    (typeof g.audioURL === 'string' && !g.audioURL.startsWith('/*') && g.audioURL.trim() !== ''
      ? await fetchAudioFromUrl(g.audioURL, am) : null);
  if (!audSrc) { ui.showError("No audio data source found."); ui.disableControls(); return; }
  const ini = {
    tempo: clamp(+(tempoSlider?.value ?? D.tempo), D.minTempo, D.maxTempo),
    pitch_s_val: clamp(D.pitch, D.minPitch, D.maxPitch),
    volume: clamp(+(volumeSlider?.value ?? D.volume), D.minVolume, D.maxVolume),
    mult: clamp(+(multiplierSlider?.value ?? D.mult), D.minMult, D.maxMult),
  };
  if (tempoSlider) Object.assign(tempoSlider, { min: D.minTempo, max: D.maxTempo, value: ini.tempo });
  if (pitchSlider) Object.assign(pitchSlider, { min: D.minPitch, max: D.maxPitch, step: D.pitchStep, value: ini.pitch_s_val });
  if (volumeSlider) Object.assign(volumeSlider, { min: D.minVolume, max: D.maxVolume, step: 0.01, value: ini.volume });
  if (multiplierSlider) Object.assign(multiplierSlider, { min: D.minMult, max: D.maxMult, step: 1, value: ini.mult });
  midiHandler.init(handleNoteOn, () => {}, handleMidiStateChange);
  if (!(await audio.init(audSrc, ini.tempo, ini.pitch_s_val))) { ui.showError("Failed to initialize audio module."); ui.disableControls(); return; }
  audio.setVolume(ini.volume);
  referencePanel && initReferencePanel(referencePanel);
  keyboardShortcuts.init?.({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
  setupEventListeners();
  ui.updateTempoDisplay(ini.tempo); ui.updatePitchDisplay(sValToP(ini.pitch_s_val));
  ui.updateVolumeDisplay(ini.volume); ui.updateScheduleMultiplierDisplay(ini.mult);
  ui.updateLoopButton(audio.getLoopingState()); ui.updateReverseButton(audio.getReverseState());
  ui.enableControls();
  console.log("Application initialized successfully.");
};

function setupEventListeners() {
  addListener(mainImage, 'click', handleLoopToggle);
  addListener(playOnceBtn, 'click', () => audio.playOnce());
  addListener(loopToggleBtn, 'click', handleLoopToggle);
  addListener(reverseToggleBtn, 'click', () => {
    audio.resumeContext().then(() => {
      const { new_s_val, new_isReversed } = audio.toggleReverse();
      ui.updateReverseButton(new_isReversed);
      if (pitchSlider && parseFloat(pitchSlider.value) !== new_s_val) {
        pitchSlider.value = new_s_val; ui.updatePitchDisplay(sValToP(new_s_val));
      }
    });
  });
  addListener(tempoSlider, 'input', e => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt));
  addListener(pitchSlider, 'input', e => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay, parseInt, sValToP));
  addListener(volumeSlider, 'input', e => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay));
  addListener(multiplierSlider, 'input', e => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt));
  addListener(midiDeviceSelect, 'change', e => midiHandler.selectDevice(e.target.value));
  addListener(infoToggleBtn, 'click', toggleSideColumns);
  window.addEventListener('keydown', e => {
    if (e.repeat || _isInputFocused(e.target)) return;
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      if (e.code === 'Space') { audio.playOnce(); e.preventDefault(); }
      else if (e.key === 'i') { toggleSideColumns(); e.preventDefault(); }
      else if (e.key === 'r') { document.getElementById('reverse-toggle-btn')?.click(); e.preventDefault(); }
    }
  });
}

function bootstrap() {
  const c = document.getElementById('app');
  if (!c) { console.error('main.js: #app not found!'); document.body.innerHTML = '<p style="color:red; padding:20px;">Fatal Error: #app missing.</p>'; return; }
  try { buildLayout(c); } catch (err) { console.error('main.js: Layout error:', err); c.innerHTML = '<p style="color:red; padding:20px;">Fatal Error: Could not build layout.</p>'; return; }
  initializeApp();
}
(document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bootstrap) : bootstrap());
// --- END OF FILE main.js ---
