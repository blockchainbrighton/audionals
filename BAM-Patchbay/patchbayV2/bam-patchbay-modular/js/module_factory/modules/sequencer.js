// js/module_factory/modules/sequencer.js
import { audioCtx } from '../../audio_context.js';

export function createSequencerModule(parent, moduleId) {
  const numSteps = 16;
  const steps = Array(numSteps).fill(false);
  let current = 0,
      playing = false,
      bpm = 120,
      interval = (60 / bpm / 4) * 1000,
      nextTime = 0,
      lookahead = 25,
      ahead = 0.1,
      timer;

  // Tiny helper to create + style elements
  const el = (tag, props = {}, style = {}) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    Object.assign(e.style, style);
    return e;
  };

  // Controls
  const playBtn = el('button', { textContent: 'Play' }),
        stopBtn = el('button', { textContent: 'Stop' });
  const ctrl = el('div');
  ctrl.append(playBtn, stopBtn);
  parent.append(ctrl);

  // Step buttons
  const stepEls = Array.from({ length: numSteps }, (_, i) => {
    const s = el('div', {}, {
      width: '20px', height: '20px', border: '1px solid #555',
      marginRight: '2px', backgroundColor: '#333', cursor: 'pointer'
    });
    s.onclick = () => {
      steps[i] = !steps[i];
      s.style.backgroundColor = steps[i] ? 'orange' : '#333';
    };
    parent.appendChild(s.parentNode === null ? (el('div', {}, { display: 'flex', marginTop: '5px' }).append(s), parent.lastChild) : null);
    return s;
  });
  // (Above line appends all stepEls into a flex container in one pass)
  const stepsContainer = el('div', {}, { display: 'flex', marginTop: '5px' });
  stepEls.forEach(s => stepsContainer.append(s));
  parent.append(stepsContainer);

  const updateUI = () => {
    stepEls.forEach((s, i) => {
      s.style.boxShadow = playing && i === current ? '0 0 5px yellow' : '';
      if (!playing) s.style.backgroundColor = steps[i] ? 'orange' : '#333';
    });
  };

  const scheduleStep = (i, time) => {
    if (steps[i]) mod.trigger(time);
  };

  const scheduler = () => {
    while (nextTime < audioCtx.currentTime + ahead) {
      scheduleStep(current, nextTime);
      nextTime += interval / 1000;
      current = (current + 1) % numSteps;
      updateUI();
    }
    if (playing) timer = setTimeout(scheduler, lookahead);
  };

  playBtn.onclick = () => {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() =>
        console.log(`[Sequencer ${moduleId}] AudioContext resumed`)
      ).catch(() => {});
    }
    if (!playing) {
      playing = true;
      current = 0;
      nextTime = audioCtx.currentTime + ahead;
      scheduler();
      playBtn.textContent = 'Pause';
      console.log(`[Sequencer ${moduleId}] Play started`);
    } else {
      playing = false;
      clearTimeout(timer);
      playBtn.textContent = 'Play';
      updateUI();
      console.log(`[Sequencer ${moduleId}] Play paused`);
    }
  };

  stopBtn.onclick = () => {
    playing = false;
    clearTimeout(timer);
    current = 0;
    playBtn.textContent = 'Play';
    updateUI();
    console.log(`[Sequencer ${moduleId}] Play stopped`);
  };

  const setTempo = newBpm => {
    bpm = newBpm;
    interval = (60 / bpm / 4) * 1000;
    console.log(`[Sequencer ${moduleId}] Tempo set to ${bpm} BPM`);
  };

  const mod = {
    id: moduleId,
    type: 'sequencer',
    element: parent,
    audioNode: null,
    play: () => playBtn.click(),
    stop: () => stopBtn.click(),
    setTempo,
    connectedTriggers: [],
    trigger: time => {
      mod.connectedTriggers.forEach(fn => {
        try { fn(time); }
        catch (e) { console.error(`[Sequencer ${moduleId}] trigger error:`, e); }
      });
    }
  };

  return mod;
}
