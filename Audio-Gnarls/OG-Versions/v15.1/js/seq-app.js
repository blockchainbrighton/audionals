/* eslint-disable no-underscore-dangle */
/**
 * =============================================================================
 * SeqApp – Configurable Step Sequencer UI (8/16/32/64 Steps)
 * =============================================================================
 * Supports dynamic step count: 8, 16, 32, 64.
 * Layout: Vertical columns of 8 (e.g., 2x8 for 16, 4x8 for 32).
 * Fully backward compatible with existing API/events.
 *
 * Refactor goals:
 * - Preserve public API/identifiers/behavior.
 * - Extract shared helpers to eliminate duplication.
 * - Prefer early returns and small, named functions.
 * - Use modern, readable ECMAScript without clever tricks.
 */

class SeqApp extends HTMLElement {
  // ----- Constants -----------------------------------------------------------
  static VALID_SIZES = [8, 16, 32, 64];
  static DEFAULT_STEPS = 8;
  static MIN_MS = 50;
  static MAX_MS = 2000;

  // ----- Private helpers -----------------------------------------------------
  #dispatch(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  #len() { return this.state.sequence.length; }
  #next(i) { return (i + 1) % this.#len(); }
  #clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  #slotEls() { return this._stepSlotsDiv?.querySelectorAll('.step-slot') ?? []; }
  #velAt(i) { return this.state.velocities?.[i] ?? 1; }
  #setSeq(i, val) { this.state.sequence[i] = val; }
  #setVel(i, val) { this.state.velocities[i] = val; }
  #isRecordingSlot(i) { return this.state.isRecording && this.state.currentRecordSlot === i; }
  #isActiveStep(i) { return this.state.sequencePlaying && this.state.sequenceStepIndex === i; }
  #setTooltip(slot, vel, suffix = 'Alt-drag to edit') {
    slot.title = `Velocity: ${Math.round(vel * 100)}% (${suffix})`;
  }

  // Compute next valid size in a given direction (+1 blocks, -1 blocks)
  #nextSize(direction) {
    const order = SeqApp.VALID_SIZES;
    const idx = order.indexOf(this.steps);
    const nextIdx = idx + direction;
    return order[nextIdx] ?? null;
  }

  #initStateForSteps(steps) {
    this.steps = steps;
    this.state.sequence = Array(steps).fill(null);
    this.state.velocities = Array(steps).fill(1);
    this.state.sequenceStepIndex = 0;
  }

  #cacheRefs() {
    this._stepSlotsDiv = this.shadowRoot.getElementById('stepSlots');
    this._playBtn = this.shadowRoot.getElementById('playBtn');
    this._stepTimeInput = this.shadowRoot.getElementById('stepTimeInput');
    this._addBlockBtn = this.shadowRoot.getElementById('addBlockBtn');
    this._removeBlockBtn = this.shadowRoot.getElementById('removeBlockBtn');
    this._stepInfo = this.shadowRoot.getElementById('stepInfo');
  }

  #attachUIEvents() {
    this._playBtn?.addEventListener('click', this.handlePlayClick);
    this._stepTimeInput?.addEventListener('change', this.handleStepTimeChange);
    this._addBlockBtn?.addEventListener('click', this.handleAddBlock);
    this._removeBlockBtn?.addEventListener('click', this.handleRemoveBlock);
  }

  #recordAt(idx, num) {
    if (!this.state.isRecording || idx < 0 || idx >= this.#len()) return;
    this.#setSeq(idx, num);
    this.state.currentRecordSlot = this.#next(idx);
    if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
    this.updateSequenceUI();
    this.#dispatch('seq-step-recorded', {
      slotIndex: idx, value: num, nextSlot: this.state.currentRecordSlot, isRecording: this.state.isRecording
    });
  }

  #clearAt(idx) {
    this.#setSeq(idx, null);
    this.updateSequenceUI();
    this.#dispatch('seq-step-cleared', { slotIndex: idx });
  }

  #paint(idx, setTo) {
    if (setTo == null) {
      this.#clearAt(idx);
      return;
    }
    this.#setSeq(idx, 0);
    this.updateSequenceUI();
    this.#dispatch('seq-step-recorded', {
      slotIndex: idx, value: 0, nextSlot: this.#next(idx), isRecording: false
    });
  }

  // Build a single step slot with event bindings.
  #createSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'step-slot';
    slot.dataset.index = String(index);

    const bar = document.createElement('div');
    bar.className = 'vel-bar';
    slot.appendChild(bar);

    const digit = document.createElement('div');
    digit.className = 'digit';
    slot.appendChild(digit);

    slot.addEventListener('click', () => this.handleStepClick(index));
    slot.addEventListener('contextmenu', (e) => this.handleStepRightClick(e, index));

    // Pointer down (paint or velocity mode)
    slot.addEventListener('pointerdown', (e) => {
      if (e.altKey) {
        Object.assign(this._dragState, {
          painting: true,
          mode: 'velocity',
          baseVel: this.#velAt(index),
          startY: e.clientY,
          lastIndex: index
        });
      } else {
        const setTo = this.state.sequence[index] == null ? 1 : null;
        Object.assign(this._dragState, { painting: true, mode: 'paint', setTo, lastIndex: -1 });
        this.#paint(index, setTo);
      }
      slot.setPointerCapture(e.pointerId);
    });

    // Drag over (paint mode)
    slot.addEventListener('pointerenter', () => {
      if (!this._dragState.painting || this._dragState.mode !== 'paint') return;
      if (this._dragState.lastIndex === index) return;
      this._dragState.lastIndex = index;
      this.#paint(index, this._dragState.setTo);
    });

    // Drag velocity
    slot.addEventListener('pointermove', (e) => {
      if (!this._dragState.painting || this._dragState.mode !== 'velocity') return;
      const dy = this._dragState.startY - e.clientY;
      const scale = e.shiftKey ? 0.25 : 1;
      const vel = this.#clamp01(this._dragState.baseVel + (dy / 150) * scale);
      this.#setVel(index, vel);
      this.#setTooltip(slot, vel, `Alt-drag${e.shiftKey ? ' + Shift' : ''}`);
      bar.style.height = `${Math.round(vel * 100)}%`;
    });

    return slot;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Default state (updated in connectedCallback with actual steps)
    this.state = {
      isRecording: false,
      currentRecordSlot: -1,
      sequence: [],
      velocities: [],
      sequencePlaying: false,
      sequenceStepIndex: 0,
      stepTime: 400
    };

    // Bind methods (preserve public API)
    [
      'updateState', 'updateSequenceUI', 'recordStep', 'playSequence', 'stopSequence',
      'handleStepClick', 'handleStepRightClick', 'handlePlayClick', 'handleStepTimeChange',
      'handleAddBlock', 'handleRemoveBlock', 'updateStepControls',
      '_onWindowKeyDown', '_onPointerUpGlobal', 'createSequenceUI', 'render',
      'changeStepCount'
    ].forEach((fn) => { this[fn] = this[fn].bind(this); });
  }

  // --- Lifecycle -----------------------------------------------------------
  connectedCallback() {
    const stepsAttr = Number(this.getAttribute('steps')) || SeqApp.DEFAULT_STEPS;
    const steps = SeqApp.VALID_SIZES.includes(stepsAttr) ? stepsAttr : SeqApp.DEFAULT_STEPS;

    this.#initStateForSteps(steps);
    this.render();
    this.updateSequenceUI();

    this.#attachUIEvents();
    window.addEventListener('pointerup', this._onPointerUpGlobal);
    // NOTE: Keydown listener intentionally not auto-attached to preserve original behavior.
  }

  disconnectedCallback() {
    window.removeEventListener('pointerup', this._onPointerUpGlobal);
    if (this._seqTimer) clearTimeout(this._seqTimer);
    if (this._tailTimer) clearTimeout(this._tailTimer);
  }

  // --- Render --------------------------------------------------------------
  render() {
    this.shadowRoot.innerHTML = `
    <style>
      :host { 
        display: block; 
        text-align: center; 
        width: 95%; 
        margin: .8em auto 0; 
        font-family: sans-serif; 
      }
      #stepSlots {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: .4em;
        margin: .6em auto .7em;
        max-width: ${Math.min(320, this.steps * 40)}px;
        width: 100%;
        justify-content: center;
        align-content: center;
        padding: 0;
        border-radius: 6px;
        background: rgba(255,255,255,0.05);
        box-shadow: 0 0 12px #00000033;
      }
      #stepControls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin: 0.5em 0;
        font-size: 0.9em;
      }
      #stepControls button {
        padding: 0.3em 0.8em;
        border-radius: 4px;
        border: 1px solid #666;
        background: #212;
        color: #ffe0a3;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.9em;
        transition: background .18s;
      }
      #stepControls button:hover { background: #323; }
      #stepControls button:disabled { opacity: 0.5; cursor: not-allowed; }
      #stepInfo { color: #aaa; font-size: 0.85em; }
      .step-slot {
        position: relative;
        width: 37px;
        height: 37px;
        border: 1px solid #555;
        border-radius: 6px;
        background: #232325;
        display: grid;
        place-items: center;
        cursor: pointer;
        font-weight: bold;
        font-size: 1.12rem;
        user-select: none;
        transition: background .15s, box-shadow .16s;
      }
      .step-slot.record-mode { background: #343; box-shadow: 0 0 7px #f7c46988; }
      .step-slot.record-mode.active { background: #575; box-shadow: 0 0 12px #f7c469d6; }
      .digit { position: relative; z-index: 2; color: #eee; }
      .vel-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 0%;
        background: #7af6ff55;
        border-bottom-left-radius: 6px;
        border-bottom-right-radius: 6px;
        pointer-events: none;
        transition: height .05s linear;
        z-index: 1;
      }
      #sequenceControls {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 1.1rem;
        margin: 1.1em 0 0;
        width: 100%;
      }
      #playBtn {
        min-width: 150px;
        font-size: 1.09rem;
        padding: 0.44em 1.4em;
        border-radius: 7px;
        margin: 0;
        background: #181818;
        color: #fff;
        border: 2px solid #7af6ff;
        transition: background .19s, color .19s;
        box-shadow: 0 2px 10px #7af6ff22;
      }
      #playBtn:hover { background: #212d3d; color: #fff; border-color: #fff; }
      #stepTimeInput { width: 60px; margin-left: 0.7em; }
    </style>

    <div id="sequencer">
      <div id="stepControls">
        <button id="removeBlockBtn">Remove Block (-8)</button>
        <span id="stepInfo">${this.steps} steps (${this.steps/8} blocks)</span>
        <button id="addBlockBtn">Add Block (+8)</button>
      </div>
      <div id="stepSlots"></div>
      <div id="sequenceControls">
        <button id="playBtn">Play Sequence</button>
        <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
        <input type="number" id="stepTimeInput" 
               min="${SeqApp.MIN_MS}" 
               max="${SeqApp.MAX_MS}" 
               value="${this.state.stepTime}" />
      </div>
    </div>
  `;

    this.#cacheRefs();
    this.createSequenceUI();
    this.updateStepControls();
  }

  createSequenceUI() {
    if (!this._stepSlotsDiv) return;
    this._stepSlotsDiv.innerHTML = '';

    // Drag state is shared across slots during a gesture
    this._dragState = { painting: false, mode: null, setTo: null, baseVel: 1, startY: 0, lastIndex: -1 };

    const frag = document.createDocumentFragment();
    for (let i = 0; i < this.steps; i++) {
      frag.appendChild(this.#createSlot(i));
    }
    this._stepSlotsDiv.appendChild(frag);
  }

  // --- Public API ----------------------------------------------------------
  updateState(newState) {
    // If steps changed, reinitialize arrays
    if ('steps' in newState) {
      const desired = SeqApp.VALID_SIZES.includes(newState.steps) ? newState.steps : this.steps;
      if (desired !== this.steps) {
        this.#initStateForSteps(desired);
        this.render();
        return;
      }
    }
    Object.assign(this.state, newState);
    this.updateSequenceUI();
  }

  updateSequenceUI() {
    if (!this._stepSlotsDiv) return;
    const { sequence, velocities } = this.state;

    this.#slotEls().forEach((slot) => {
      const idx = Number(slot.dataset.index);
      const val = sequence[idx];
      const digitEl = slot.querySelector('.digit');
      digitEl.textContent = (val === 0) ? '0' : (val ?? '');

      slot.classList.toggle('record-mode', this.#isRecordingSlot(idx));
      slot.classList.toggle('active', this.#isActiveStep(idx));

      const vel = velocities?.[idx] ?? 1;
      const barEl = slot.querySelector('.vel-bar');
      if (barEl) barEl.style.height = `${Math.round(vel * 100)}%`;

      // Preserve any custom tooltips; only assign if not already a velocity tooltip
      if (!slot.title?.startsWith('Velocity:')) this.#setTooltip(slot, vel);
    });

    if (this._playBtn) this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
    if (this._stepTimeInput && !this.state.sequencePlaying) this._stepTimeInput.value = this.state.stepTime;

    this.updateStepControls();
  }

  // --- Interaction handlers -----------------------------------------------
  handleStepClick(index) {
    this.state.isRecording = true;
    this.state.currentRecordSlot = index;
    this.updateSequenceUI();
    this.#dispatch('seq-record-start', { slotIndex: index });
  }

  handleStepRightClick(event, index) {
    event.preventDefault();
    this.#setSeq(index, null);

    if (this.state.isRecording && this.state.currentRecordSlot === index) {
      this.state.currentRecordSlot = this.#next(index);
      if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
    }

    this.updateSequenceUI();
    this.#dispatch('seq-step-cleared', { slotIndex: index });
  }

  handlePlayClick() {
    if (this.state.sequencePlaying) {
      this.stopSequence();
      return;
    }
    this.playSequence();
  }

  handleStepTimeChange() {
    if (!this._stepTimeInput) return;
    const val = Number.parseInt(this._stepTimeInput.value, 10);
    if (!Number.isFinite(val)) return;
    if (val < SeqApp.MIN_MS || val > SeqApp.MAX_MS) return;

    this.state.stepTime = val;
    this.#dispatch('seq-step-time-changed', { stepTime: val });
  }

  handleAddBlock() {
    if (this.state.sequencePlaying) return; // Don't allow changes during playback
    const next = this.#nextSize(+1);
    if (!next) return; // Already at maximum
    this.changeStepCount(next);
  }

  handleRemoveBlock() {
    if (this.state.sequencePlaying) return; // Don't allow changes during playback
    const next = this.#nextSize(-1);
    if (!next) return; // Already at minimum
    this.changeStepCount(next);
  }

  changeStepCount(newSteps) {
    if (!SeqApp.VALID_SIZES.includes(newSteps)) return;

    // Stop any recording
    this.state.isRecording = false;
    this.state.currentRecordSlot = -1;

    // Preserve existing sequence data up to the new length
    const oldSequence = [...this.state.sequence];
    const oldVelocities = [...this.state.velocities];

    this.steps = newSteps;
    this.state.sequence = Array(newSteps).fill(null);
    this.state.velocities = Array(newSteps).fill(1);

    // Copy over existing data
    const limit = Math.min(oldSequence.length, newSteps);
    for (let i = 0; i < limit; i++) {
      this.state.sequence[i] = oldSequence[i];
      this.state.velocities[i] = oldVelocities[i];
    }

    // Reset step index if it's beyond the new range
    if (this.state.sequenceStepIndex >= newSteps) {
      this.state.sequenceStepIndex = 0;
    }

    // Re-render the entire component (render() rebuilds DOM)
    this.render();

    // Re-attach control listeners after render
    this.#attachUIEvents();

    this.updateSequenceUI();

    // Notify parent
    this.#dispatch('seq-steps-changed', { steps: newSteps });
  }

  updateStepControls() {
    if (this._addBlockBtn) this._addBlockBtn.disabled = this.steps >= 64 || this.state.sequencePlaying;
    if (this._removeBlockBtn) this._removeBlockBtn.disabled = this.steps <= 8 || this.state.sequencePlaying;
    if (this._stepInfo) this._stepInfo.textContent = `${this.steps} steps (${this.steps/8} blocks)`;
  }

  _onWindowKeyDown(e) {
    if (!this.state.isRecording || !/^[0-9]$/.test(e.key)) return;
    const idx = this.state.currentRecordSlot;
    this.#recordAt(idx, Number.parseInt(e.key, 10));
  }

  _onPointerUpGlobal() {
    if (!this._dragState) return;
    Object.assign(this._dragState, { painting: false, mode: null, lastIndex: -1 });
  }

  // --- Sequencing ----------------------------------------------------------
  recordStep(number) {
    const idx = this.state.currentRecordSlot;
    this.#recordAt(idx, number);
  }

  playSequence() {
    if (this.state.sequencePlaying) return;

    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    this.updateSequenceUI();
    this.#dispatch('seq-play-started', { stepTime: this.state.stepTime });

    const stepFn = () => {
      if (!this.state.sequencePlaying) return;

      const idx = this.state.sequenceStepIndex;
      const value = this.state.sequence[idx];
      const velocity = this.#velAt(idx);
      const isLastStep = this.#next(idx) === 0;

      // Keep 'index' for backward-compat with external listeners
      this.#dispatch('seq-step-advance', { stepIndex: idx, index: idx, value, velocity, isLastStep });

      this.state.sequenceStepIndex = this.#next(idx);
      this.updateSequenceUI();

      if (this.state.sequencePlaying) {
        this._seqTimer = setTimeout(stepFn, this.state.stepTime);
      } else {
        this._seqTimer = null;
      }
    };

    stepFn();
  }

  stopSequence() {
    this.state.sequencePlaying = false;

    if (this._seqTimer) { clearTimeout(this._seqTimer); this._seqTimer = null; }
    if (this._tailTimer) { clearTimeout(this._tailTimer); this._tailTimer = null; }

    this.updateSequenceUI();
    this.#dispatch('seq-play-stopped', {});

    // Small "tail" ensures downstream listeners get a final neutral event
    const tailDelay = Math.max(20, Math.min(this.state.stepTime, 200));
    this._tailTimer = setTimeout(() => {
      this.#dispatch('seq-step-advance', {
        stepIndex: -1, index: -1, value: 0, velocity: 1, isLastStep: true
      });
      this._tailTimer = null;
    }, tailDelay);
  }
}

customElements.define('seq-app', SeqApp);
