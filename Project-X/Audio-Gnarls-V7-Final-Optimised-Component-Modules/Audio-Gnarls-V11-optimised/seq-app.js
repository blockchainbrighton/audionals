/* eslint-disable no-underscore-dangle */
/**
 * =============================================================================
 * SeqApp – 8-Step Sequencer UI (Web Component)
 * =============================================================================
 * (Refactored for concision + maintainability; public API/behavior preserved)
 */

class SeqApp extends HTMLElement {
  // ----- Constants -----------------------------------------------------------
  static STEPS = 8;
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
    if (setTo == null) this.#clearAt(idx);
    else {
      this.#setSeq(idx, 0);
      this.updateSequenceUI();
      this.#dispatch('seq-step-recorded', { slotIndex: idx, value: 0, nextSlot: this.#next(idx), isRecording: false });
    }
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.state = {
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(SeqApp.STEPS).fill(null),
      velocities: Array(SeqApp.STEPS).fill(1),
      sequencePlaying: false,
      sequenceStepIndex: 0,
      stepTime: 400
    };

    // Bind public/handler methods once (names preserved)
    [
      'updateState','updateSequenceUI','recordStep','playSequence','stopSequence',
      'handleStepClick','handleStepRightClick','handlePlayClick','handleStepTimeChange',
      '_onWindowKeyDown','_onPointerUpGlobal'
    ].forEach(fn => (this[fn] = this[fn].bind(this)));
  }

  connectedCallback() {
    this.render();
    this.updateSequenceUI();

    this._playBtn?.addEventListener('click', this.handlePlayClick);
    this._stepTimeInput?.addEventListener('change', this.handleStepTimeChange);

    // window.addEventListener('keydown', this._onWindowKeyDown);  // managed by parent app
    window.addEventListener('pointerup', this._onPointerUpGlobal);
  }

disconnectedCallback() {
  window.removeEventListener('keydown', this._onWindowKeyDown);
  window.removeEventListener('pointerup', this._onPointerUpGlobal);
  if (this._seqTimer) { clearTimeout(this._seqTimer); this._seqTimer = null; }
  if (this._tailTimer) { clearTimeout(this._tailTimer); this._tailTimer = null; }
}

  // --- Render --------------------------------------------------------------
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; text-align:center; width:95%; margin:.8em auto 0; }
        #stepSlots { display:flex; justify-content:center; gap:.55em; margin:.6em 0 .7em; }
        .step-slot {
          position: relative; width:37px; height:37px; border:1px solid #555; border-radius:6px;
          background:#232325; display:grid; place-items:center; cursor:pointer;
          font-weight:bold; font-size:1.12rem; user-select:none;
          transition:background .15s, box-shadow .16s;
        }
        .step-slot.record-mode { background:#343; box-shadow:0 0 7px #f7c46988; }
        .step-slot.record-mode.active { background:#575; box-shadow:0 0 12px #f7c469d6; }
        .digit { position:relative; z-index:2; }
        .vel-bar {
          position:absolute; bottom:0; left:0; width:100%; height:0%;
          background:#7af6ff55; border-bottom-left-radius:6px; border-bottom-right-radius:6px;
          pointer-events:none; transition:height .05s linear; z-index:1;
        }
        #sequenceControls {
          display:flex; flex-direction:row; align-items:center; justify-content:center;
          gap:1.1rem; margin:1.1em 0 0; width:100%;
        }
        #playBtn {
          min-width:150px; font-size:1.09rem; padding:0.44em 1.4em; border-radius:7px;
          margin:0; background:#181818; color:#fff; border:2px solid #7af6ff;
          transition:background .19s, color .19s; box-shadow:0 2px 10px #7af6ff22;
        }
        #playBtn:hover { background:#212d3d; color:#fff; border-color:#fff; }
        #stepTimeInput { width:60px; margin-left:0.7em; }
      </style>

      <div id="sequencer">
        <div id="stepSlots"></div>
        <div id="sequenceControls">
          <button id="playBtn">Play Sequence</button>
          <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
          <input type="number" id="stepTimeInput" min="${SeqApp.MIN_MS}" max="${SeqApp.MAX_MS}" value="${this.state.stepTime}" />
        </div>
      </div>
    `;

    // Cache refs
    this._stepSlotsDiv = this.shadowRoot.getElementById('stepSlots');
    this._playBtn = this.shadowRoot.getElementById('playBtn');
    this._stepTimeInput = this.shadowRoot.getElementById('stepTimeInput');

    this.createSequenceUI();
  }

  createSequenceUI() {
    if (!this._stepSlotsDiv) return;
    this._stepSlotsDiv.innerHTML = '';

    // Drag state
    this._dragState = { painting:false, mode:null, setTo:null, baseVel:1, startY:0, lastIndex:-1 };

    for (let i = 0; i < SeqApp.STEPS; i++) {
      const slot = document.createElement('div');
      slot.className = 'step-slot';
      slot.dataset.index = String(i);

      const bar = document.createElement('div');
      bar.className = 'vel-bar';
      slot.appendChild(bar);

      const digit = document.createElement('div');
      digit.className = 'digit';
      slot.appendChild(digit);

      slot.addEventListener('click', () => this.handleStepClick(i));
      slot.addEventListener('contextmenu', (e) => this.handleStepRightClick(e, i));

      slot.addEventListener('pointerdown', (e) => {
        const idx = i;
        if (e.altKey) {
          // Velocity mode
          Object.assign(this._dragState, {
            painting: true, mode: 'velocity', baseVel: this.#velAt(idx), startY: e.clientY, lastIndex: idx
          });
          slot.setPointerCapture(e.pointerId);
        } else {
          // Paint mode (toggle)
          const setTo = this.state.sequence[idx] == null ? 1 : null;
          Object.assign(this._dragState, { painting: true, mode: 'paint', setTo, lastIndex: -1 });
          this.#paint(idx, setTo);
          slot.setPointerCapture(e.pointerId);
        }
      });

      slot.addEventListener('pointerenter', () => {
        if (!this._dragState.painting || this._dragState.mode !== 'paint') return;
        const idx = i;
        if (this._dragState.lastIndex === idx) return;
        this._dragState.lastIndex = idx;
        this.#paint(idx, this._dragState.setTo);
      });

      slot.addEventListener('pointermove', (e) => {
        if (!this._dragState.painting || this._dragState.mode !== 'velocity') return;
        const idx = i;
        const dy = this._dragState.startY - e.clientY;
        const scale = e.shiftKey ? 0.25 : 1;
        const vel = this.#clamp01(this._dragState.baseVel + (dy / 150) * scale);
        this.#setVel(idx, vel);
        this.#setTooltip(slot, vel, `Alt-drag${e.shiftKey ? ' + Shift' : ''}`);
        bar.style.height = `${Math.round(vel * 100)}%`;
      });

      this._stepSlotsDiv.appendChild(slot);
    }
  }

  // --- Public API ----------------------------------------------------------
  updateState(newState) {
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
      if (digitEl) digitEl.textContent = (val === 0) ? '0' : (val ?? '') + '';

      slot.classList.toggle('record-mode', this.#isRecordingSlot(idx));
      slot.classList.toggle('active', this.#isActiveStep(idx));

      const vel = velocities?.[idx] ?? 1;
      const barEl = slot.querySelector('.vel-bar');
      if (barEl) barEl.style.height = `${Math.round(vel * 100)}%`;

      if (!slot.title?.startsWith('Velocity:')) this.#setTooltip(slot, vel);
    });

    if (this._playBtn) this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
    if (this._stepTimeInput && !this.state.sequencePlaying) this._stepTimeInput.value = this.state.stepTime;
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
    if (this.state.sequencePlaying) this.stopSequence(); else this.playSequence();
  }

  handleStepTimeChange() {
    if (!this._stepTimeInput) return;
    const val = Number.parseInt(this._stepTimeInput.value, 10);
    if (Number.isFinite(val) && val >= SeqApp.MIN_MS && val <= SeqApp.MAX_MS) {
      this.state.stepTime = val;
      this.#dispatch('seq-step-time-changed', { stepTime: val });
    }
  }

  _onWindowKeyDown(e) {
    if (!this.state.isRecording || !/^[0-9]$/.test(e.key)) return;
    const idx = this.state.currentRecordSlot;
    this.#recordAt(idx, Number.parseInt(e.key, 10));
  }

  _onPointerUpGlobal() {
    if (!this._dragState) return;
    Object.assign(this._dragState, { painting:false, mode:null, lastIndex:-1 });
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
    if (!this.state.sequencePlaying) return; // hard guard

    const idx = this.state.sequenceStepIndex;
    const value = this.state.sequence[idx];
    const velocity = this.#velAt(idx);
    const isLastStep = this.#next(idx) === 0;

    this.#dispatch('seq-step-advance', { stepIndex: idx, index: idx, value, velocity, isLastStep });

    this.state.sequenceStepIndex = this.#next(idx);
    this.updateSequenceUI();

    // ⬇️ Only schedule next tick if we're still playing
    if (this.state.sequencePlaying) {
      this._seqTimer = setTimeout(stepFn, this.state.stepTime);
    } else {
      this._seqTimer = null;
    }
  };

  stepFn();
}


  stopSequence() {
  // Stop regular scheduling
  this.state.sequencePlaying = false;

  if (this._seqTimer) { clearTimeout(this._seqTimer); this._seqTimer = null; }
  if (this._tailTimer) { clearTimeout(this._tailTimer); this._tailTimer = null; }

  // Update UI and announce stop
  this.updateSequenceUI();
  this.#dispatch('seq-play-stopped', {});

  // Organic tail: one extra step as "0" (hum), after a short delay
  // Use a small fraction of stepTime so it feels like the next step
  const tailDelay = Math.max(20, Math.min(this.state.stepTime, 200)); // 20..200ms is snappy
  this._tailTimer = setTimeout(() => {
    // Re-emit using your existing event so downstream stays in sync
    this.#dispatch('seq-step-advance', {
      stepIndex: -1, index: -1, value: 0, velocity: 1, isLastStep: true
    });
    this._tailTimer = null;
  }, tailDelay);
}

}

customElements.define('seq-app', SeqApp);
