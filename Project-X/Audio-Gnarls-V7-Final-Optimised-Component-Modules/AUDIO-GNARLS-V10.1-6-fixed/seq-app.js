// File: seq-app.js
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
      
      // Bind methods
      [
        'updateState',
        'updateSequenceUI',
        'recordStep',
        'playSequence',
        'stopSequence',
        'handleStepClick',
        'handleStepRightClick',
        'handlePlayClick',
        'handleStepTimeChange'
      ].forEach(fn => this[fn] = this[fn].bind(this));
    }
  
    connectedCallback() {
      this.render();
      this.updateSequenceUI();
      // Wire up controls
      if (this._playBtn) this._playBtn.addEventListener('click', () => this.handlePlayClick());
      if (this._stepTimeInput) this._stepTimeInput.addEventListener('change', () => this.handleStepTimeChange());
      // Global key handler for recording digits into sequence
      this._keyHandler = (e) => {
        if (!this.state.isRecording) return;
        if (!/^[0-9]$/.test(e.key)) return;
        const num = parseInt(e.key, 10);
        const idx = this.state.currentRecordSlot;
        this.state.sequence[idx] = num;
        this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
        if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
        this.updateSequenceUI();
        this.dispatchEvent(new CustomEvent('seq-step-recorded', {
          detail: { slotIndex: idx, value: num, nextSlot: this.state.currentRecordSlot, isRecording: this.state.isRecording },
          bubbles: true, composed: true
        }));
      };
      window.addEventListener('keydown', this._keyHandler);
    }

  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; text-align:center; width:95%; margin:.8em auto 0 auto; }
          #stepSlots { display:flex; justify-content:center; gap:.55em; margin:.6em 0 .7em 0; }
          .step-slot { 
            width:37px; height:37px; border:1px solid #555; border-radius:6px; 
            background:#232325; display:grid; place-items:center; cursor:pointer; 
            font-weight:bold; font-size:1.12rem; user-select:none; 
            transition:background .15s,box-shadow .16s; 
          }
          .step-slot.record-mode { background:#343; box-shadow:0 0 7px #f7c46988; }
          .step-slot.record-mode.active { background:#575; box-shadow:0 0 12px #f7c469d6; }
          #sequenceControls { 
            display:flex; flex-direction:row; align-items:center; justify-content:center; 
            gap:1.1rem; margin:1.1em 0 0 0; width:100%;
          }
          #playBtn { 
            min-width:150px; font-size:1.09rem; padding:0.44em 1.4em; border-radius:7px; 
            margin:0; background:#181818; color:#fff; border:2px solid #7af6ff; 
            transition:background .19s,color .19s; box-shadow:0 2px 10px #7af6ff22;
          }
          #playBtn:hover { background:#212d3d; color:#fff; border-color:#fff; }
        </style>
        
        <div id="sequencer">
          <div id="stepSlots"></div>
          <div id="sequenceControls">
            <button id="playBtn">Play Sequence</button>
            <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
            <input type="number" id="stepTimeInput" min="50" max="2000" value="400" style="width:60px;margin-left:0.7em;" />
          </div>
        </div>
      `;
  
      // Initialize UI elements
      this._stepSlotsDiv = this.shadowRoot.getElementById('stepSlots');
      this._playBtn = this.shadowRoot.getElementById('playBtn');
      this._stepTimeInput = this.shadowRoot.getElementById('stepTimeInput');
      
      // Create step slots
      this.createSequenceUI();
    }
    createSequenceUI() {
  // Clear existing slots
  this._stepSlotsDiv.innerHTML = '';

  // Drag state
  this._dragState = { painting:false, mode:null, setTo:null, baseVel:1, startY:0, lastIndex:-1 };

  const onPointerUp = () => { this._dragState.painting = false; this._dragState.mode = null; this._dragState.lastIndex = -1; };
  window.addEventListener('pointerup', onPointerUp);

  // Create new slots
  for (let i = 0; i < 8; i++) {
    const slot = document.createElement('div');
    slot.classList.add('step-slot');
    slot.dataset.index = i;
    slot.style.position = 'relative';

    // velocity bar
    const bar = document.createElement('div');
    bar.className = 'vel-bar';
    Object.assign(bar.style, {
      position: 'absolute',
      bottom: '0px',
      left: '0px',
      width: '100%',
      height: '0%',
      background: '#7af6ff55',
      borderBottomLeftRadius: '6px',
      borderBottomRightRadius: '6px',
      pointerEvents: 'none',
      transition: 'height .05s linear'
    });
    slot.appendChild(bar);

    // Click starts record mode (existing behavior)
    slot.addEventListener('click', () => this.handleStepClick(i));
    slot.addEventListener('contextmenu', (e) => this.handleStepRightClick(e, i));

    // Drag-paint & velocity adjust
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
        // Paint on/off mode toggling to desired state
        const current = this.state.sequence[idx];
        const setTo = (current == null) ? 1 : null;
        this._dragState.painting = true;
        this._dragState.mode = 'paint';
        this._dragState.setTo = setTo;
        this._dragState.lastIndex = -1;
        // apply immediately
        if (setTo === null) {
          this.state.sequence[idx] = null;
          this.dispatchEvent(new CustomEvent('seq-step-cleared', { detail:{ slotIndex: idx }, bubbles:true, composed:true }));
        } else {
          // set default value 1 (user can overwrite with number keys later)
          this.state.sequence[idx] = 1;
          this.dispatchEvent(new CustomEvent('seq-step-recorded', { detail:{ slotIndex: idx, value: 1, nextSlot: (idx+1)%8, isRecording:false }, bubbles:true, composed:true }));
        }
        this.updateSequenceUI();
        slot.setPointerCapture(e.pointerId);
      }
    });

    slot.addEventListener('pointerenter', (e) => {
      if (!this._dragState.painting) return;
      const idx = i;
      if (this._dragState.mode === 'paint') {
        if (this._dragState.lastIndex === idx) return;
        this._dragState.lastIndex = idx;
        const setTo = this._dragState.setTo;
        if (setTo === null) {
          this.state.sequence[idx] = null;
          this.dispatchEvent(new CustomEvent('seq-step-cleared', { detail:{ slotIndex: idx }, bubbles:true, composed:true }));
        } else {
          this.state.sequence[idx] = 1;
          this.dispatchEvent(new CustomEvent('seq-step-recorded', { detail:{ slotIndex: idx, value: 1, nextSlot: (idx+1)%8, isRecording:false }, bubbles:true, composed:true }));
        }
        this.updateSequenceUI();
      }
    });

    slot.addEventListener('pointermove', (e) => {
      if (!this._dragState.painting) return;
      if (this._dragState.mode !== 'velocity') return;
      const idx = i;
      const dy = (this._dragState.startY - e.clientY);
      const scale = e.shiftKey ? 0.25 : 1.0;
      let vel = this._dragState.baseVel + (dy / 150) * scale;
      vel = Math.max(0, Math.min(1, vel));
      this.state.velocities[idx] = vel;
      // title / tooltip
      slot.title = `Velocity: ${Math.round(vel*100)}% (Alt-drag${e.shiftKey? ' + Shift':''})`;
      // update bar height
      const barEl = slot.querySelector('.vel-bar');
      if (barEl) barEl.style.height = Math.round(vel*100) + '%';
    });

    this._stepSlotsDiv.appendChild(slot);
  }

      // Add event listeners for controls
      this._playBtn.addEventListener('click', this.handlePlayClick);
      this._stepTimeInput.addEventListener('change', this.handleStepTimeChange);
    }
  
    updateState(newState) {
      // Update state with new values
      Object.assign(this.state, newState);
      this.updateSequenceUI();
    }
  updateSequenceUI() {
    if (!this._stepSlotsDiv) return;
    this._stepSlotsDiv.querySelectorAll('.step-slot').forEach((slot) => {
      const idx = parseInt(slot.dataset.index);
      const val = this.state.sequence[idx];
      // Display digit or blank
      slot.textContent = (val === 0) ? '0' : (val != null ? String(val) : '');
      slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === idx);
      slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === idx);
      // velocity bar
      const vel = (this.state.velocities && this.state.velocities[idx] != null) ? this.state.velocities[idx] : 1;
      const barEl = slot.querySelector('.vel-bar');
      if (barEl) barEl.style.height = Math.round(vel*100) + '%';
      if (!slot.title || !slot.title.startsWith('Velocity:')) {
        slot.title = `Velocity: ${Math.round(vel*100)}% (Alt-drag to edit)`;
      }
    });
      
      // Update play button
      if (this._playBtn) {
        this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
      }
      
      // Update step time input
      if (this._stepTimeInput && !this.state.sequencePlaying) {
        this._stepTimeInput.value = this.state.stepTime;
      }
    }
  
    handleStepClick(index) {
    // Start recording at this index; number keys will set the value (1-9, 0)
    this.state.isRecording = true;
    this.state.currentRecordSlot = index;
    this.updateSequenceUI();
    // Notify parent
    this.dispatchEvent(new CustomEvent('seq-record-start', {
      detail: { slotIndex: index },
      bubbles: true,
      composed: true
    }));
    }
  
    handleStepRightClick(event, index) {
      event.preventDefault();
      
      // Clear the step
      this.state.sequence[index] = null;
      
      // If we're recording in this slot, move to next
      if (this.state.isRecording && this.state.currentRecordSlot === index) {
        this.state.currentRecordSlot = (index + 1) % 8;
        if (this.state.currentRecordSlot === 0) {
          this.state.isRecording = false;
        }
      }
      
      this.updateSequenceUI();
      
      // Dispatch event to notify parent
      this.dispatchEvent(new CustomEvent('seq-step-cleared', {
        detail: { slotIndex: index },
        bubbles: true,
        composed: true
      }));
    }
  
    handlePlayClick() {
      if (this.state.sequencePlaying) {
        this.stopSequence();
      } else {
        this.playSequence();
      }
    }
  handleStepTimeChange() {
    if (!this._stepTimeInput) return;
    const val = parseInt(this._stepTimeInput.value, 10);
    if (Number.isFinite(val) && val >= 50 && val <= 2000) {
      this.state.stepTime = val;
      this.dispatchEvent(new CustomEvent('seq-step-time-changed', { detail: { stepTime: val }, bubbles: true, composed: true }));
    }
  }

  recordStep(number) {
      const idx = this.state.currentRecordSlot;
      if (!this.state.isRecording || idx < 0 || idx >= this.state.sequence.length) return;
      
      this.state.sequence[idx] = number;
      this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
      
      // If we've completed a full cycle, stop recording
      if (this.state.currentRecordSlot === 0) {
        this.state.isRecording = false;
      }
      
      this.updateSequenceUI();
      
      // Dispatch event to notify parent
      this.dispatchEvent(new CustomEvent('seq-step-recorded', {
        detail: { 
          slotIndex: idx, 
          value: number,
          nextSlot: this.state.currentRecordSlot,
          isRecording: this.state.isRecording
        },
        bubbles: true,
        composed: true
      }));
    }
  playSequence() {
    if (this.state.sequencePlaying) return;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-play-started', { bubbles: true, composed: true }));
    const stepFn = () => {
      if (!this.state.sequencePlaying) return;
      const idx = this.state.sequenceStepIndex;
      // fire event for current step
      const value = this.state.sequence[idx];
      const velocity = (this.state.velocities && this.state.velocities[idx] != null) ? this.state.velocities[idx] : 1;
      this.dispatchEvent(new CustomEvent('seq-step-advance', { detail: { index: idx, value, velocity }, bubbles: true, composed: true }));
      // advance
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