// sequencer.js
// Manages the step sequencer UI and playback logic.
// Designed for zero-latency integration with the main app.

class OscSequencer extends HTMLElement {
    constructor() {
      super();
      this.state = {
        sequence: Array(8).fill(null),
        sequencePlaying: false,
        sequenceIntervalId: null,
        sequenceStepIndex: 0,
        stepTime: 400,
        isRecording: false,
        currentRecordSlot: -1
      };
  
      this.shapes = ['circle','square','butterfly','lissajous','spiro','harmonograph'];
      this.attachShadow({ mode: 'open' });
  
      this._stepSlotsDiv = null;
      this._playBtn = null;
      this._stepTimeInput = null;
  
      this.updateUI = this.updateUI.bind(this);
      this.playSequence = this.playSequence.bind(this);
      this.stopSequence = this.stopSequence.bind(this);
      this.recordStep = this.recordStep.bind(this);
    }
  
    connectedCallback() {
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          text-align: center;
          width: 95%;
          margin: .8em auto 0 auto;
        }
        #stepSlots {
          display: flex;
          justify-content: center;
          gap: .55em;
          margin: .6em 0 .7em 0;
        }
        .step-slot {
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
        .step-slot.record-mode {
          background: #343;
          box-shadow: 0 0 7px #f7c46988;
        }
        .step-slot.record-mode.active {
          background: #575;
          box-shadow: 0 0 12px #f7c469d6;
        }
        #sequenceControls {
          margin-top: .5em;
        }
        #playBtn {
          padding: 0.4em 1em;
          border: none;
          border-radius: 4px;
          background: #212;
          color: #ffe0a3;
          cursor: pointer;
          font-size: 0.97em;
          margin-right: 1em;
        }
        #stepTimeInput {
          width: 60px;
          padding: 0.35em;
          border: 1px solid #444;
          background: #232325;
          color: #ffecb3;
          font-size: 1em;
        }
        label {
          color: #ffecb3;
          font-size: 0.97em;
          margin-left: 1.2em;
        }
      `;
  
      const container = document.createElement('div');
      container.id = 'sequencer';
  
      const stepSlots = document.createElement('div');
      stepSlots.id = 'stepSlots';
      container.appendChild(stepSlots);
      this._stepSlotsDiv = stepSlots;
  
      const controls = document.createElement('div');
      controls.id = 'sequenceControls';
  
      const playBtn = document.createElement('button');
      playBtn.id = 'playBtn';
      playBtn.textContent = 'Play Sequence';
      this._playBtn = playBtn;
  
      const stepTimeLabel = document.createElement('label');
      stepTimeLabel.textContent = 'Step Time (ms):';
      stepTimeLabel.setAttribute('for', 'stepTimeInput');
  
      const stepTimeInput = document.createElement('input');
      stepTimeInput.type = 'number';
      stepTimeInput.id = 'stepTimeInput';
      stepTimeInput.min = '50';
      stepTimeInput.max = '2000';
      stepTimeInput.value = '400';
      this._stepTimeInput = stepTimeInput;
  
      controls.append(playBtn, stepTimeLabel, stepTimeInput);
      container.appendChild(controls);
  
      this.shadowRoot.append(style, container);
  
      // Events
      this._playBtn.onclick = () => {
        this.state.sequencePlaying ? this.stopSequence() : this.playSequence();
      };
      this._stepTimeInput.addEventListener('change', () => {
        const val = parseInt(this._stepTimeInput.value, 10);
        if (val >= 50 && val <= 2000) {
          this.state.stepTime = val;
          if (this.state.sequencePlaying) {
            this.stopSequence();
            this.playSequence();
          }
        } else {
          this._stepTimeInput.value = this.state.stepTime;
        }
      });
  
      this.updateUI();
    }
  
    // Public API
    createSequenceUI() {
      this._stepSlotsDiv.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.classList.add('step-slot');
        slot.dataset.index = i;
        slot.textContent = this.state.sequence[i] || '';
  
        slot.addEventListener('click', () => {
          this.state.isRecording = true;
          this.state.currentRecordSlot = i;
          this.updateUI();
        });
  
        slot.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.state.sequence[i] = null;
          if (this.state.isRecording && this.state.currentRecordSlot === i) {
            this.state.currentRecordSlot = (i + 1) % 8;
            if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
          }
          this.updateUI();
        });
  
        this._stepSlotsDiv.appendChild(slot);
      }
      this.updateUI();
    }
  
    updateUI() {
      const slots = this._stepSlotsDiv.querySelectorAll('.step-slot');
      slots.forEach(slot => {
        const i = parseInt(slot.dataset.index);
        slot.textContent = this.state.sequence[i] || '';
        slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === i);
        slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === i);
      });
      this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
    }
  
    recordStep(number) {
      if (!this.state.isRecording) return;
      const i = this.state.currentRecordSlot;
      this.state.sequence[i] = number;
      this.state.currentRecordSlot = (i + 1) % 8;
      if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
      this.updateUI();
    }
  
    playSequence() {
      if (this.state.sequencePlaying) return;
      this.state.sequencePlaying = true;
      this.state.sequenceStepIndex = 0;
  
      const stepFn = () => {
        const idx = this.state.sequenceStepIndex;
        const val = this.state.sequence[idx];
        if (val != null) {
          const shapeKey = this.shapes[val - 1];
          this.dispatchEvent(new CustomEvent('step', {
            detail: { shapeKey, stepIndex: idx }
          }));
        }
        this.state.sequenceStepIndex = (idx + 1) % 8;
        this.updateUI();
      };
  
      stepFn();
      this.state.sequenceIntervalId = setInterval(stepFn, this.state.stepTime);
      this.updateUI();
    }
  
    stopSequence() {
      if (!this.state.sequencePlaying) return;
      clearInterval(this.state.sequenceIntervalId);
      this.state.sequenceIntervalId = null;
      this.state.sequencePlaying = false;
      this.state.sequenceStepIndex = 0;
      this.updateUI();
    }
  
    reset() {
      this.stopSequence();
      this.state.sequence = Array(8).fill(null);
      this.state.isRecording = false;
      this.state.currentRecordSlot = -1;
      this.updateUI();
    }
  
    setStepTime(ms) {
      this._stepTimeInput.value = ms;
      this.state.stepTime = ms;
    }
  
    isVisible() {
      return this.shadowRoot.host.parentElement && this.shadowRoot.host.offsetParent !== null;
    }
  }
  
  customElements.define('osc-sequencer', OscSequencer);