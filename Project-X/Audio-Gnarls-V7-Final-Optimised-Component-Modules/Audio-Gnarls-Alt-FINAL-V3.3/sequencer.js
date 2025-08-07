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
 * Start playing the sequence on a loop. Invokes update functions on
 * each step and loops based on state.stepTime. If already playing it
 * does nothing. Passing in callbacks allows decoupling from any
 * specific UI or component.
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
  const stepFn = () => {
    const idx = state.sequenceStepIndex;
    const val = state.sequence[idx];
    if (val != null) {
      const shapeKey = shapes[val - 1];
      if (typeof updateControlsFn === 'function') {
        updateControlsFn(shapeKey);
      }
      if (typeof onShapeChangeFn === 'function') {
        onShapeChangeFn(shapeKey);
      }
    }
    state.sequenceStepIndex = (state.sequenceStepIndex + 1) % state.sequence.length;
    updateSequenceUIFn();
  };
  stepFn();
  state.sequenceIntervalId = setInterval(stepFn, state.stepTime);
}

/**
 * Stop playing the sequence. Clears the interval and resets the
 * sequence position. Invokes the provided update callback.
 * @param {object} state
 * @param {function} updateSequenceUIFn
 */
export function stopSequence(state, updateSequenceUIFn) {
  if (!state.sequencePlaying) return;
  clearInterval(state.sequenceIntervalId);
  state.sequenceIntervalId = null;
  state.sequencePlaying = false;
  state.sequenceStepIndex = 0;
  updateSequenceUIFn();
}