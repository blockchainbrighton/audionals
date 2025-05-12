// main.js
import { initPaletteAndCanvasDragDrop } from './drag_drop_manager.js';
import { createModule } from './module_factory/module_factory.js';
import { clearAllModules } from './module_manager.js';
import { applyZoom, resetZoom, tidyModules } from './canvas_controls.js';
import { state, getMasterBpm, setMasterBpm, getIsPlaying, setGlobalPlayState } from './shared_state.js';
import { audioCtx } from './audio_context.js';
import { createSampleSequencedChain, createOscillatorGainOutputChain } from './presetProcessingChains.js';


document.addEventListener('DOMContentLoaded', () => {
  console.log('Audio Modular Synthesizer Initializing...');

  const $ = id => document.getElementById(id);
  const canvasEl = $('canvas');

  if (!canvasEl) return console.error('#canvas element not found');
  canvasEl.style.transform = `scale(${state.currentZoom})`;
  console.log(`Initial canvas zoom set to: ${state.currentZoom.toFixed(2)}`);

  // Button handlers map: id -> handler
  const actions = {
    'clear-all-btn': () => confirm('Remove ALL modules?') && clearAllModules(),
    'zoom-in-btn': () => applyZoom(0.1),
    'zoom-out-btn': () => applyZoom(-0.1),
    'reset-zoom-btn': resetZoom,
    'tidy-grid-btn': tidyModules
  };
  Object.entries(actions).forEach(([id, fn]) => $(id)?.addEventListener('click', fn));

  // Master BPM
  const bpmInput = $('master-bpm-input');
  if (bpmInput) {
    bpmInput.value = getMasterBpm();
    const commit = () => {
      let v = parseInt(bpmInput.value, 10);
      const min = +bpmInput.min || 20, max = +bpmInput.max || 300;
      if (isNaN(v) || v < min || v > max) {
        console.warn(`Invalid BPM '${bpmInput.value}' (${min}-${max}), reverting.`);
        bpmInput.value = getMasterBpm();
      } else bpmInput.value = setMasterBpm(v);
    };
    bpmInput.addEventListener('blur', commit);
    bpmInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') bpmInput.value = getMasterBpm();
    });
  } else console.error("Element 'master-bpm-input' not found");

  // Global Play/Stop
  const playBtn = $('play-stop-button');
  if (playBtn) {
    const updateBtn = () => {
      const playing = getIsPlaying();
      playBtn.textContent = playing ? 'Stop' : 'Play';
      playBtn.style.backgroundColor = playing ? '#28a745' : '#dc3545';
    };
    updateBtn();
    playBtn.addEventListener('click', async () => {
      const next = !getIsPlaying();
      if (next && audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); console.log('AudioContext resumed'); }
        catch (e) { return console.error('Error resuming AudioContext:', e); }
      }
      setGlobalPlayState(next);
      updateBtn();
    });
  } else console.error("Element 'play-stop-button' not found");


  // Add to existing actions or create new handlers
  const presetActions = {
    // Update your button IDs if different
    'preset-sample-chain-btn': () => createSampleSequencedChain(250, 50), // startX for sample player
    // 'preset-osc-lfo-chain-btn': () => createOscLfoGainOutputChain(50, 250),
    'preset-osc-lfo-chain-btn': () => createOscillatorGainOutputChain(50, 150), // NEW

  };

  Object.entries(presetActions).forEach(([id, fn]) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', async () => {
        try {
          await fn();
        } catch (error) {
          console.error(`[MainJS] Error executing preset action for ${id}:`, error);
        }
      });
    }
  });


  // Module creation
  const create = async (type, x, y) => {
    try {
      const m = await createModule(type, x, y);
      console.log(m ? `Module ${m.type} (ID: ${m.id}) at ${x.toFixed(0)},${y.toFixed(0)}`
                          : `Failed to create ${type}`);
    } catch (e) { console.error(`Error creating ${type}:`, e); }
  };

  const onDrop = (type, e) => {
    if (!type || !e) return console.error('Invalid drop args');
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / state.currentZoom;
    const y = (e.clientY - rect.top) / state.currentZoom;
    console.log(`Drop: ${type} @(${x.toFixed(2)},${y.toFixed(2)}) zoom=${state.currentZoom}`);
    create(type, x, y);
  };

  initPaletteAndCanvasDragDrop(onDrop);
  console.log('Initialization Complete.');
});
