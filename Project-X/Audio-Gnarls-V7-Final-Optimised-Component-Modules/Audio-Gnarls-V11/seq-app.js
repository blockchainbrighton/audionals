/**
 * =============================================================================
 * SeqApp – 8-Step Sequencer UI (Web Component)
 * =============================================================================
 *
 * PURPOSE
 * -------
 * <seq-app> provides an interactive 8-step trigger/number sequencer with per-step
 * velocity and fixed-interval playback. It is UI-only: timing is driven by an
 * internal JS timer (setTimeout), and musical/audio behavior is expected to be
 * handled by the parent application listening to the component’s custom events.
 *
 * TOP-LEVEL BEHAVIOR
 * ------------------
 * • 8 step "slots", each can hold a digit (0–9, or empty/null) and a velocity 0..1.
 * • Record mode lets users click a slot then type 0–9 to set values sequentially.
 * • Painting:
 *    - Click or drag across slots to toggle steps on/off (default value = 1).
 *    - Alt+drag on a slot to adjust its velocity (Shift for fine control).
 * • Playback:
 *    - Fixed step duration `stepTime` (ms). Advancements fire events every tick.
 *    - UI displays the active step, and button text toggles Play/Stop.
 *
 * SHADOW DOM / RENDERING
 * ----------------------
 * • Uses Shadow DOM; internal styles do not leak. External theming is limited
 *   unless you add CSS custom properties/::part in the future.
 * • UI consists of:
 *    - #stepSlots: 8 .step-slot elements with a .digit (text) and .vel-bar (height).
 *    - #sequenceControls: Play button + numeric input for stepTime.
 *
 * PUBLIC STATE & METHODS
 * ----------------------
 * Internal state (this.state):
 *   {
 *     isRecording: boolean,
 *     currentRecordSlot: number (-1 when none),
 *     sequence: (number|null)[]  // length 8, values 0..9 or null
 *     velocities: number[]       // length 8, 0..1
 *     sequencePlaying: boolean,
 *     sequenceStepIndex: number,
 *     stepTime: number           // ms, 50..2000
 *   }
 *
 * Public methods:
 *   - updateState(partialState: object): merges into internal state and re-renders.
 *   - recordStep(number: 0..9): records at currentRecordSlot (if in record mode).
 *   - playSequence(): starts timer-driven stepping (no-op if already playing).
 *   - stopSequence(): stops playback, clears timer, updates UI.
 *
 * CUSTOM EVENTS (OUTBOUND API)
 * ----------------------------
 * All events bubble and are composed (usable outside shadow DOM).
 *
 * 1) 'seq-record-start'
 *    detail: { slotIndex: number }
 *    Emitted when user clicks a step to arm record mode.
 *
 * 2) 'seq-step-recorded'
 *    detail: {
 *      slotIndex: number,
 *      value: number,                // 0..9
 *      nextSlot: number,             // next index modulo 8
 *      isRecording: boolean
 *    }
 *    Emitted on number entry OR paint-on action that sets value to 1.
 *
 * 3) 'seq-step-cleared'
 *    detail: { slotIndex: number }
 *    Emitted when a step is cleared (right-click or paint-off).
 *
 * 4) 'seq-step-time-changed'
 *    detail: { stepTime: number }    // only fired via UI input change
 *
 * 5) 'seq-play-started'
 *    detail: { stepTime: number }
 *    Emitted when playback begins.
 *
 * 6) 'seq-step-advance'
 *    detail: {
 *      stepIndex: number,            // current step (0..7)
 *      index: number,                // alias for stepIndex
 *      value: number|null,           // digit at step or null
 *      velocity: number,             // 0..1 (defaults to 1)
 *      isLastStep: boolean           // true when next step wraps to 0
 *    }
 *    Emitted every tick before advancing to the next step.
 *
 * 7) 'seq-play-stopped'
 *    detail: {}
 *    Emitted when playback stops.
 *
 * INPUT / USER INTERACTION
 * ------------------------
 * • Click a step: arms record mode on that index (keyboard numbers write).
 * • Right-click a step: clears it (and advances record slot if you were recording).
 * • Drag painting:
 *    - PointerDown w/o Alt: start paint mode (toggle to on with value=1, or off).
 *    - PointerEnter while painting: applies same on/off to hovered steps.
 * • Alt+PointerDown/Move: velocity adjust for the hovered step (title shows %).
 *   Hold Shift while adjusting for finer scaling (~¼ speed).
 * • Play button toggles play/stop.
 * • Step Time input changes `stepTime` (only applied when not running via UI);
 *   programmatic updates can occur anytime via updateState.
 *
 * TIMING MODEL
 * -----------
 * • Playback uses recursive setTimeout(stepFn, this.state.stepTime).
 * • Changing `stepTime` during playback affects the *next* scheduled tick.
 * • Accuracy is typical setTimeout granularity; for tight sync, drive time in a
 *   parent clock and call updateState/stopSequence/playSequence or dispatch a
 *   custom event to align with your audio engine’s tempo grid.
 *
 * LIFECYCLE
 * ---------
 * • connectedCallback(): render; wire UI handlers; (keydown listener is managed
 *   by the parent app to avoid duplication — see comment in code).
 * • disconnectedCallback(): removes global listeners; consider calling
 *   stopSequence() if you add long-running external timers in the future.
 *
 * EXTENSIBILITY HOOKS
 * -------------------
 * • Steps count: currently fixed at 8. To change, parameterize length everywhere
 *   that assumes 8 (UI construction, modulo arithmetic, arrays).
 * • Velocity UX: tune dy→velocity mapping in pointermove; consider non-linear curves.
 * • Theming: expose CSS custom properties or ::part hooks to enable host styling.
 * • Accessibility: add ARIA roles/labels, focus styles, and keyboard step nav if needed.
 *
 * EDGE CASES / GOTCHAS
 * --------------------
 * • Keydown handling: This component *removes* a keydown listener in
 *   disconnectedCallback but does not add one here to avoid double registration;
 *   the parent (e.g., osc-app.js) attaches it. If you enable key handling here,
 *   make sure add/remove are symmetric.
 * • Right-click clears: preventDefault is used, which suppresses the context menu.
 * • Painting sets new steps to value=1; number entry will overwrite during record.
 * • Title tooltip for velocity is only updated during velocity adjustments or UI refresh.
 * • Step Time bounds enforced by input (50..2000ms). Programmatic updates should
 *   respect these bounds in your orchestrator.
 * • Timers: _seqTimer is cleared on stop; ensure no double timers by guarding play().
 *
 * TESTING TIPS
 * ------------
 * • Simulate long drags across slots (pointerenter logic) to verify paint coherence.
 * • Verify Alt-drag + Shift, and that velocities persist across UI refreshes.
 * • Start/stop rapidly to ensure timer cleanup and correct active step highlighting.
 * • Modify stepTime mid-play via updateState and confirm tick spacing adapts next cycle.
 *
 * =============================================================================
 * DEVELOPER QUICK REFERENCE
 * =============================================================================
 *
 * // Instantiate
 * const seq = document.createElement('seq-app');
 * document.body.appendChild(seq);
 *
 * // Listen for sequencing ticks
 * seq.addEventListener('seq-step-advance', (e) => {
 *   const { stepIndex, value, velocity, isLastStep } = e.detail;
 *   // Drive your synth/transport here
 *   // Example: triggerNote(value, { velocity });
 * });
 *
 * // Start/Stop
 * seq.addEventListener('seq-play-started', (e) => {
 *   console.log('Play started @', e.detail.stepTime, 'ms');
 * });
 * seq.addEventListener('seq-play-stopped', () => {
 *   console.log('Stopped');
 * });
 *
 * // Programmatic state updates
 * seq.updateState({
 *   sequence: [1, null, 5, 2, null, 9, null, 0],
 *   velocities: [1, .6, .9, .8, .7, .5, .4, 1],
 *   stepTime: 180
 * });
 *
 * // Toggle transport
 * seq.playSequence();
 * // seq.stopSequence();
 *
 * // Enter record mode on a slot, then feed digits
 * seq.updateState({ isRecording: true, currentRecordSlot: 0 });
 * seq.recordStep(3); // writes '3' at slot 0, advances to 1
 *
 * // Respond to UI edits
 * seq.addEventListener('seq-step-time-changed', (e) => {
 *   // Optionally sync your engine’s tempo/grid here
 *   console.log('Step time now', e.detail.stepTime, 'ms');
 * });
 *
 * // Clear a step programmatically
 * const s = seq.state.sequence.slice();
 * s[4] = null;
 * seq.updateState({ sequence: s });
 *
 * INTEGRATION PATTERN (tempo-sync hint)
 * -------------------------------------
 * // If you have a master clock, do NOT rely on component timers. Instead:
 * // 1) Stop internal timer: seq.stopSequence();
 * // 2) On each master tick, compute the next index yourself and call:
 * //    seq.updateState({ sequenceStepIndex: nextIndex, sequencePlaying: true });
 * // 3) Fire your own audio events and optionally mirror to UI via updateState.
 *
 * =============================================================================
 */



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
