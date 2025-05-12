// js/module_factory/modules/sequencer.js
import { audioCtx } from '../../audio_context.js';
import { getMasterBpm } from '../../shared_state.js';

export function createSequencerModule(parent, moduleId) {
  const numSteps = 16;
  const steps = Array(numSteps).fill(false);
  let currentStep = 0,
      bpm = getMasterBpm(),
      intervalMs = (60 / bpm / 4) * 1000,
      nextTime = 0,
      isPlaying = false,
      timerId;

  const lookahead = 25, // ms
        aheadSec   = 0.1; // schedule ahead

  const el = (tag, props = {}, css = '') => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    e.style.cssText = css;
    return e;
  };

  // UI
  const container = el('div', {}, 'display:flex;gap:2px;margin:5px 0;');
  const elems = Array.from({ length: numSteps }, (_, i) => {
    const d = el('div', {}, `
      width:20px;height:20px;
      border:1px solid #555;
      background:#333;
      cursor:pointer;
      box-sizing:border-box;
    `);
    d.onclick = () => {
      steps[i] = !steps[i];
      d.style.background = steps[i] ? 'orange' : '#333';
    };
    container.appendChild(d);
    return d;
  });
  parent.appendChild(container);

  const updateUI = () => elems.forEach((d, i) => {
    d.style.border = isPlaying && i === currentStep
      ? '2px solid yellow'
      : '1px solid #555';
    if (!isPlaying) d.style.background = steps[i] ? 'orange' : '#333';
  });

  // audio scheduling
  const tick = (i, t) => {
    if (!steps[i]) return;
    if (inst.connected.length) {
      console.log(
        `[Sequencer ${moduleId}] Step ${i} active; firing ${inst.connected.length} triggers at ${t.toFixed(3)}`
      );
      inst.connected.forEach((fn, idx) => {
        if (typeof fn === 'function') {
          try { fn(t); }
          catch (e) {
            console.error(
              `[Sequencer ${moduleId}] Error in trigger ${idx}:`, e
            );
          }
        } else {
          console.error(
            `[Sequencer ${moduleId}] Invalid trigger[${idx}]:`, fn
          );
        }
      });
    }
  };

  const scheduler = () => {
    while (nextTime < audioCtx.currentTime + aheadSec) {
      tick(currentStep, nextTime);
      nextTime += intervalMs / 1000;
      currentStep = (currentStep + 1) % numSteps;
    }
    updateUI();
    if (isPlaying) timerId = setTimeout(scheduler, lookahead);
  };

  // controls
  const inst = {
    id: moduleId,
    type: 'sequencer',
    element: parent,
    connected: [],

    setTempo(newBpm) {
      bpm = newBpm;
      intervalMs = (60 / bpm / 4) * 1000;
      console.log(`[Sequencer ${moduleId}] BPM set to ${bpm}; interval ${intervalMs.toFixed(1)}ms`);
    },

    startSequence() {
      if (isPlaying) return;
      isPlaying = true;
      currentStep = 0;
      nextTime = audioCtx.currentTime + 0.05;
      console.log(`[Sequencer ${moduleId}] Starting; triggers:`, inst.connected.length);
      scheduler();
    },

    stopSequence() {
      if (!isPlaying) return;
      isPlaying = false;
      clearTimeout(timerId);
      console.log(`[Sequencer ${moduleId}] Stopped`);
      updateUI();
    },

    connectTrigger(fn) {
      console.log(`[Sequencer ${moduleId}] Connecting trigger:`, fn);
      if (typeof fn === 'function') {
        inst.connected.push(fn);
        console.log(`[Sequencer ${moduleId}] ${inst.connected.length} triggers connected`);
      } else {
        console.error(`[Sequencer ${moduleId}] Cannot connect non-function:`, fn);
      }
    },

    disconnectTrigger(fn) {
      const before = inst.connected.length;
      inst.connected = inst.connected.filter(x => x !== fn);
      console.log(
        `[Sequencer ${moduleId}] ${before - inst.connected.length} triggers removed`
      );
    }
  };

  updateUI();
  return inst;
}
