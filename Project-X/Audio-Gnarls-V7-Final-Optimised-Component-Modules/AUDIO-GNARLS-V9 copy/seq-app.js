// File: seq-app.js
class SeqApp extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.state = {
        isRecording: false,
        currentRecordSlot: -1,
        sequence: Array(8).fill(null),
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
      
      // Create new slots
      for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.classList.add('step-slot');
        slot.dataset.index = i;
        
        // Add event listeners
        slot.addEventListener('click', () => this.handleStepClick(i));
        slot.addEventListener('contextmenu', (e) => this.handleStepRightClick(e, i));
        
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
      
      // Update step slots
      this._stepSlotsDiv.querySelectorAll('.step-slot').forEach((slot) => {
        const idx = parseInt(slot.dataset.index);
        const val = this.state.sequence[idx];
        
        // Update display value
        slot.textContent = val === 0 ? '0' : (val !== null && val >= 1 && val <= 9 ? val : '');
        
        // Update classes
        slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === idx);
        slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === idx);
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
      this.state.isRecording = true;
      this.state.currentRecordSlot = index;
      this.updateSequenceUI();
      
      // Dispatch event to notify parent
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
      const val = parseInt(this._stepTimeInput.value, 10);
      if (val >= 50 && val <= 2000) {
        this.state.stepTime = val;
        
        // If already playing, restart with new timing
        if (this.state.sequencePlaying) {
          this.stopSequence();
          this.playSequence();
        }
        
        // Dispatch event to notify parent
        this.dispatchEvent(new CustomEvent('seq-step-time-changed', {
          detail: { stepTime: this.state.stepTime },
          bubbles: true,
          composed: true
        }));
      } else {
        // Reset to previous value
        this._stepTimeInput.value = this.state.stepTime;
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
      
      // Dispatch event to notify parent
      this.dispatchEvent(new CustomEvent('seq-play-started', {
        detail: { stepTime: this.state.stepTime },
        bubbles: true,
        composed: true
      }));
      
      // Create the step function
      const stepFn = () => {
        const idx = this.state.sequenceStepIndex;
        const val = this.state.sequence[idx];
        
        // Dispatch event with the current step value
        this.dispatchEvent(new CustomEvent('seq-step-advance', {
          detail: { 
            stepIndex: idx, 
            value: val,
            isLastStep: idx === 7
          },
          bubbles: true,
          composed: true
        }));
        
        // Move to next step
        this.state.sequenceStepIndex = (idx + 1) % this.state.sequence.length;
        this.updateSequenceUI();
      };
      
      // Execute first step immediately
      stepFn();
      
      // Store interval ID
      this.state.sequenceIntervalId = setInterval(stepFn, this.state.stepTime);
    }
  
    stopSequence() {
      if (!this.state.sequencePlaying) return;
      
      // Clear interval
      clearInterval(this.state.sequenceIntervalId);
      this.state.sequenceIntervalId = null;
      
      // Update state
      this.state.sequencePlaying = false;
      this.state.sequenceStepIndex = 0;
      
      this.updateSequenceUI();
      
      // Dispatch event to notify parent
      this.dispatchEvent(new CustomEvent('seq-play-stopped', {
        bubbles: true,
        composed: true
      }));
    }
  }
  
  customElements.define('seq-app', SeqApp);