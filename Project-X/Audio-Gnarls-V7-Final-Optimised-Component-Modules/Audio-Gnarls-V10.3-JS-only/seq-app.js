
class SeqApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.state = {
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(8).fill(null),
      velocities: Array(8).fill(1),
      sequencePlaying: false,
      sequenceStepIndex: 0,
      stepTime: 400
    };

    // Bind methods once
    [
      'updateState','updateSequenceUI','recordStep','playSequence','stopSequence',
      'handleStepClick','handleStepRightClick','handlePlayClick','handleStepTimeChange',
      '_onWindowKeyDown','_onPointerUpGlobal'
    ].forEach(fn => this[fn] = this[fn].bind(this));
  }

  connectedCallback() {
    this.render();
    this.updateSequenceUI();

    // Controls
    this._playBtn?.addEventListener('click', this.handlePlayClick);
    this._stepTimeInput?.addEventListener('change', this.handleStepTimeChange);

    // Global listeners
    // window.addEventListener('keydown', this._onWindowKeyDown); duplicated line in osc-app.js
    window.addEventListener('pointerup', this._onPointerUpGlobal);
  }

  disconnectedCallback() {
    // Remove global listeners
    window.removeEventListener('keydown', this._onWindowKeyDown);
    window.removeEventListener('pointerup', this._onPointerUpGlobal);
  }

  // --- Render --------------------------------------------------------------
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; text-align:center; width:95%; margin:.8em auto 0 auto; }
        #stepSlots { display:flex; justify-content:center; gap:.55em; margin:.6em 0 .7em 0; }
        .step-slot {
          position: relative;
          width:37px; height:37px; border:1px solid #555; border-radius:6px;
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
          gap:1.1rem; margin:1.1em 0 0 0; width:100%;
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
          <input type="number" id="stepTimeInput" min="50" max="2000" value="400" />
        </div>
      </div>
    `;

    // Cache refs
    this._stepSlotsDiv = this.shadowRoot.getElementById('stepSlots');
    this._playBtn = this.shadowRoot.getElementById('playBtn');
    this._stepTimeInput = this.shadowRoot.getElementById('stepTimeInput');

    // Build slots
    this.createSequenceUI();
  }

  createSequenceUI() {
    this._stepSlotsDiv.innerHTML = '';

    // Drag state
    this._dragState = { painting:false, mode:null, setTo:null, baseVel:1, startY:0, lastIndex:-1 };

    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.classList.add('step-slot');
      slot.dataset.index = i;

      // Velocity bar
      const bar = document.createElement('div');
      bar.className = 'vel-bar';
      slot.appendChild(bar);

      // Digit layer (so we don't blow away children when updating text)
      const digit = document.createElement('div');
      digit.className = 'digit';
      slot.appendChild(digit);

      // Click: start record at this index
      slot.addEventListener('click', () => this.handleStepClick(i));
      // Right‑click: clear
      slot.addEventListener('contextmenu', (e) => this.handleStepRightClick(e, i));

      // Pointer interactions
      slot.addEventListener('pointerdown', (e) => {
        const idx = i;
        if (e.altKey) {
          // Velocity mode
          this._dragState.painting = true;
          this._dragState.mode = 'velocity';
          this._dragState.baseVel = this.state.velocities[idx] ?? 1;
          this._dragState.startY = e.clientY;
          this._dragState.lastIndex = idx;
          slot.setPointerCapture(e.pointerId);
        } else {
          // Paint on/off mode
          const current = this.state.sequence[idx];
          const setTo = (current == null) ? 1 : null;
          this._dragState.painting = true;
          this._dragState.mode = 'paint';
          this._dragState.setTo = setTo;
          this._dragState.lastIndex = -1;

          if (setTo === null) {
            this.state.sequence[idx] = null;
            this.dispatchEvent(new CustomEvent('seq-step-cleared', { detail: { slotIndex: idx }, bubbles: true, composed: true }));
          } else {
            this.state.sequence[idx] = 1; // default
            this.dispatchEvent(new CustomEvent('seq-step-recorded', { detail: { slotIndex: idx, value: 1, nextSlot: (idx + 1) % 8, isRecording: false }, bubbles: true, composed: true }));
          }
          this.updateSequenceUI();
          slot.setPointerCapture(e.pointerId);
        }
      });

      slot.addEventListener('pointerenter', () => {
        if (!this._dragState.painting) return;
        const idx = i;
        if (this._dragState.mode === 'paint') {
          if (this._dragState.lastIndex === idx) return;
          this._dragState.lastIndex = idx;
          const setTo = this._dragState.setTo;
          if (setTo === null) {
            this.state.sequence[idx] = null;
            this.dispatchEvent(new CustomEvent('seq-step-cleared', { detail: { slotIndex: idx }, bubbles: true, composed: true }));
          } else {
            this.state.sequence[idx] = 1;
            this.dispatchEvent(new CustomEvent('seq-step-recorded', { detail: { slotIndex: idx, value: 1, nextSlot: (idx + 1) % 8, isRecording: false }, bubbles: true, composed: true }));
          }
          this.updateSequenceUI();
        }
      });

      slot.addEventListener('pointermove', (e) => {
        if (!this._dragState.painting || this._dragState.mode !== 'velocity') return;
        const idx = i;
        const dy = (this._dragState.startY - e.clientY);
        const scale = e.shiftKey ? 0.25 : 1.0;
        let vel = this._dragState.baseVel + (dy / 150) * scale;
        vel = Math.max(0, Math.min(1, vel));
        this.state.velocities[idx] = vel;
        slot.title = `Velocity: ${Math.round(vel * 100)}% (Alt‑drag${e.shiftKey ? ' + Shift' : ''})`;
        bar.style.height = Math.round(vel * 100) + '%';
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
    this._stepSlotsDiv.querySelectorAll('.step-slot').forEach((slot) => {
      const idx = parseInt(slot.dataset.index, 10);
      const val = this.state.sequence[idx];

      // Display digit or blank in the dedicated layer
      const digitEl = slot.querySelector('.digit');
      if (digitEl) digitEl.textContent = (val === 0) ? '0' : (val != null ? String(val) : '');

      // Highlight state
      slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === idx);
      slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === idx);

      // Velocity bar height
      const vel = (this.state.velocities && this.state.velocities[idx] != null) ? this.state.velocities[idx] : 1;
      const barEl = slot.querySelector('.vel-bar');
      if (barEl) barEl.style.height = Math.round(vel * 100) + '%';

      // Tooltip
      if (!slot.title || !slot.title.startsWith('Velocity:')) {
        slot.title = `Velocity: ${Math.round(vel * 100)}% (Alt‑drag to edit)`;
      }
    });

    // Button text
    if (this._playBtn) this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';

    // Step time input reflects state when not running
    if (this._stepTimeInput && !this.state.sequencePlaying) this._stepTimeInput.value = this.state.stepTime;
  }

  // --- Interaction handlers -----------------------------------------------
  handleStepClick(index) {
    // Start recording at this index; number keys will set the value (1‑9, 0)
    this.state.isRecording = true;
    this.state.currentRecordSlot = index;
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-record-start', { detail: { slotIndex: index }, bubbles: true, composed: true }));
  }

  handleStepRightClick(event, index) {
    event.preventDefault();
    this.state.sequence[index] = null;

    if (this.state.isRecording && this.state.currentRecordSlot === index) {
      this.state.currentRecordSlot = (index + 1) % 8;
      if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
    }

    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-step-cleared', { detail: { slotIndex: index }, bubbles: true, composed: true }));
  }

  handlePlayClick() {
    if (this.state.sequencePlaying) this.stopSequence(); else this.playSequence();
  }

  handleStepTimeChange() {
    if (!this._stepTimeInput) return;
    const val = parseInt(this._stepTimeInput.value, 10);
    if (Number.isFinite(val) && val >= 50 && val <= 2000) {
      this.state.stepTime = val;
      this.dispatchEvent(new CustomEvent('seq-step-time-changed', { detail: { stepTime: val }, bubbles: true, composed: true }));
    }
  }

  _onWindowKeyDown(e) {
    if (!this.state.isRecording) return;
    if (!/^[0-9]$/.test(e.key)) return;
    const num = parseInt(e.key, 10);
    const idx = this.state.currentRecordSlot;
    if (idx < 0 || idx >= this.state.sequence.length) return;

    this.state.sequence[idx] = num;
    this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
    if (this.state.currentRecordSlot === 0) this.state.isRecording = false;

    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-step-recorded', {
      detail: { slotIndex: idx, value: num, nextSlot: this.state.currentRecordSlot, isRecording: this.state.isRecording },
      bubbles: true, composed: true
    }));
  }

  _onPointerUpGlobal() {
    // End any drag‑paint / velocity gestures
    if (!this._dragState) return;
    this._dragState.painting = false;
    this._dragState.mode = null;
    this._dragState.lastIndex = -1;
  }

  // --- Sequencing ----------------------------------------------------------
  recordStep(number) {
    const idx = this.state.currentRecordSlot;
    if (!this.state.isRecording || idx < 0 || idx >= this.state.sequence.length) return;

    this.state.sequence[idx] = number;
    this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
    if (this.state.currentRecordSlot === 0) this.state.isRecording = false;

    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-step-recorded', {
      detail: { slotIndex: idx, value: number, nextSlot: this.state.currentRecordSlot, isRecording: this.state.isRecording },
      bubbles: true, composed: true
    }));
  }

  playSequence() {
    if (this.state.sequencePlaying) return;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    this.updateSequenceUI();

    // Notify parent with current timing
    this.dispatchEvent(new CustomEvent('seq-play-started', { detail: { stepTime: this.state.stepTime }, bubbles: true, composed: true }));

    const stepFn = () => {
      if (!this.state.sequencePlaying) return;
      const idx = this.state.sequenceStepIndex;
      const value = this.state.sequence[idx];
      const velocity = (this.state.velocities && this.state.velocities[idx] != null) ? this.state.velocities[idx] : 1;
      const isLastStep = ((idx + 1) % this.state.sequence.length) === 0;

      // Provide both `stepIndex` and `index` for compatibility
      this.dispatchEvent(new CustomEvent('seq-step-advance', {
        detail: { stepIndex: idx, index: idx, value, velocity, isLastStep },
        bubbles: true, composed: true
      }));

      // Advance and schedule next tick
      this.state.sequenceStepIndex = (idx + 1) % this.state.sequence.length;
      this.updateSequenceUI();
      this._seqTimer = setTimeout(stepFn, this.state.stepTime);
    };

    stepFn();
  }

  stopSequence() {
    this.state.sequencePlaying = false;
    if (this._seqTimer) { clearTimeout(this._seqTimer); this._seqTimer = null; }
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-play-stopped', { bubbles: true, composed: true }));
  }
}

customElements.define('seq-app', SeqApp);
