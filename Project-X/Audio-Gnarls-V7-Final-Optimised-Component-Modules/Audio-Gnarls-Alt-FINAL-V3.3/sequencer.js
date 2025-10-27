// Stateless helper functions for the step sequencer logic. These
// functions operate purely on a provided state object and DOM nodes.
// They mirror the original logic from osc-app.js but are extracted
// so that sequencer behaviour can be delegated without keeping
// internal state in the component.

/**
 * Record a step into the sequence. Advances the current record slot
 * automatically and stops recording when the sequence wraps around.
 * @param {object} state
 * @param {number} number
 * @param {function} updateSequenceUIFn
 */
export function recordStep(state, number, updateSequenceUIFn) {
  if (!state.isRecording) return;
  const idx = state.currentRecordSlot;
  if (idx < 0 || idx >= state.sequence.length) return;
  state.sequence[idx] = number;
  // Advance to next slot
  state.currentRecordSlot = (idx + 1) % state.sequence.length;
  // If we've wrapped around, stop recording
  if (state.currentRecordSlot === 0) {
    state.isRecording = false;
  }
  updateSequenceUIFn();
}

/**
 * Update the appearance of the sequence slots and the play button.
 * Reflects recording state, active step indicator and current values.
 * @param {object} state
 * @param {HTMLElement} stepSlotsDiv
 * @param {HTMLElement} playBtn
 */
export function updateSequenceUI(state, stepSlotsDiv, playBtn) {
  const slots = stepSlotsDiv.querySelectorAll('.step-slot');
  slots.forEach(slot => {
    const idx = parseInt(slot.dataset.index, 10);
    const val = state.sequence[idx];
    slot.textContent = val || '';
    slot.classList.toggle('record-mode', state.isRecording && state.currentRecordSlot === idx);
    slot.classList.toggle('active', state.sequencePlaying && state.sequenceStepIndex === idx);
  });
  if (playBtn) playBtn.textContent = state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
}

/**
 * Initialise the step sequence UI. Builds the slots, attaches event
 * listeners for recording and clearing, and sets up the play/stop
 * button and step time input.
 * @param {object} state
 * @param {HTMLElement} stepSlotsDiv
 * @param {HTMLElement} playBtn
 * @param {HTMLInputElement} stepTimeInput
 * @param {function} updateSequenceUIFn
 * @param {function} playFn
 * @param {function} stopFn
 */
export function createSequenceUI(state, stepSlotsDiv, playBtn, stepTimeInput, updateSequenceUIFn, playFn, stopFn) {
  stepSlotsDiv.innerHTML = '';
  for (let i = 0; i < state.sequence.length; i++) {
    const slot = document.createElement('div');
    slot.classList.add('step-slot');
    slot.dataset.index = i.toString();
    slot.textContent = state.sequence[i] ? state.sequence[i] : '';
    // Left click to select slot for recording
    slot.addEventListener('click', () => {
      const idx = parseInt(slot.dataset.index, 10);
      state.isRecording = true;
      state.currentRecordSlot = idx;
      updateSequenceUIFn();
    });
    // Right click clears the slot
    slot.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const idx = parseInt(slot.dataset.index, 10);
      state.sequence[idx] = null;
      // If clearing the current record slot, advance to next or stop recording
      if (state.isRecording && state.currentRecordSlot === idx) {
        state.currentRecordSlot = (idx + 1) % state.sequence.length;
        // Stop recording if we've wrapped around
        if (state.currentRecordSlot === 0) {
          state.isRecording = false;
        }
      }
      updateSequenceUIFn();
    });
    stepSlotsDiv.appendChild(slot);
  }
  // Play button toggles sequence playback
  playBtn.onclick = () => {
    if (state.sequencePlaying) stopFn(); else playFn();
  };
  // Step time input handler
  stepTimeInput.onchange = () => {
    const val = parseInt(stepTimeInput.value, 10);
    if (val >= 50 && val <= 2000) {
      state.stepTime = val;
      if (state.sequencePlaying) {
        stopFn();
        playFn();
      }
    } else {
      stepTimeInput.value = state.stepTime;
    }
  };
  updateSequenceUIFn();
}

/**
 * Start playing the sequence on a loop. If Tone.Transport is available
 * and the context is unlocked, prefer it for more stable timing. Falls
 * back to setInterval otherwise.
 * @param {object} state
 * @param {string[]} shapes
 * @param {function} updateControlsFn
 * @param {function} onShapeChangeFn
 * @param {function} updateSequenceUIFn
 */
export function playSequence(state, shapes, updateControlsFn, onShapeChangeFn, updateSequenceUIFn) {
  if (state.sequencePlaying) return;
  state.sequencePlaying = true;
  state.sequenceStepIndex = 0;
  updateSequenceUIFn();

  const stepCore = () => {
    const idx = state.sequenceStepIndex;
    const val = state.sequence[idx];
    if (val != null) {
      const shapeKey = shapes[val - 1];
      if (typeof updateControlsFn === 'function') updateControlsFn(shapeKey);
      if (typeof onShapeChangeFn === 'function') onShapeChangeFn(shapeKey);
    }
    state.sequenceStepIndex = (state.sequenceStepIndex + 1) % state.sequence.length;
    updateSequenceUIFn();
  };

  // Prefer Tone.Transport if available
  const Tone = state.Tone;
  if (Tone && Tone.Transport && typeof Tone.Transport.scheduleRepeat === 'function') {
    // Convert ms stepTime to seconds interval
    const intervalSec = Math.max(0.05, state.stepTime / 1000);
    // Ensure transport is running
    try { Tone.Transport.start(); } catch (_) {}
    const id = Tone.Transport.scheduleRepeat(() => stepCore(), intervalSec);
    state.sequenceIntervalId = { type: 'transport', id };
  } else {
    // Fallback to setInterval
    stepCore();
    const id = setInterval(stepCore, state.stepTime);
    state.sequenceIntervalId = { type: 'interval', id };
  }
}

/**
 * Stop playing the sequence. Clears the interval/transport event and
 * resets the sequence position. Invokes the provided update callback.
 * @param {object} state
 * @param {function} updateSequenceUIFn
 */
export function stopSequence(state, updateSequenceUIFn) {
  if (!state.sequencePlaying) return;
  const handle = state.sequenceIntervalId;
  if (handle) {
    if (handle.type === 'transport' && state.Tone?.Transport) {
      try { state.Tone.Transport.clear(handle.id); } catch (_) {}
    } else if (handle.type === 'interval') {
      clearInterval(handle.id);
    }
  }
  state.sequenceIntervalId = null;
  state.sequencePlaying = false;
  state.sequenceStepIndex = 0;
  updateSequenceUIFn();
}