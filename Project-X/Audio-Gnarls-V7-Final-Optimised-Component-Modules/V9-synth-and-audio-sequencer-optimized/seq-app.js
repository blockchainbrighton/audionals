// File: seq-app.js
import { ogSampleUrls } from './audional-base64-sample-loader.js';

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
      stepTime: 400,
      sampleChannels: Array.from({ length: 4 }, () => ({
        sampleIndex: 0,
        steps: Array(8).fill(false)
      }))
    };
    [
      'updateState', 'updateSequenceUI', 'updateSampleUI', 'recordStep',
      'playSequence', 'stopSequence', 'handleStepClick', 'handleStepRightClick',
      'handlePlayClick', 'handleStepTimeChange', 'handleSampleChange', 'handleSampleStepClick'
    ].forEach(fn => this[fn] = this[fn].bind(this));
    this._sampleSelects = [];
    this._sampleStepDivs = [];
  }

  connectedCallback() {
    this.render();
    this.updateSequenceUI();
    this.updateSampleUI();
    // Dispatch initial sample selection for parent to preload players
    this.state.sampleChannels.forEach((ch, idx) => {
      this.dispatchEvent(new CustomEvent('seq-sample-selected', {
        detail: { channelIndex: idx, sampleIndex: ch.sampleIndex },
        bubbles: true, composed: true
      }));
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; text-align:center; width:95%; margin:.8em auto 0 auto; }
        #stepSlots { display:flex; justify-content:center; gap:.55em; margin:.6em 0 .7em 0; }
        .step-slot { width:37px; height:37px; border:1px solid #555; border-radius:6px; background:#232325; display:grid; place-items:center; cursor:pointer; font-weight:bold; font-size:1.12rem; user-select:none; transition:background .15s,box-shadow .16s; }
        .step-slot.record-mode { background:#343; box-shadow:0 0 7px #f7c46988; }
        .step-slot.record-mode.active { background:#575; box-shadow:0 0 12px #f7c469d6; }
        #sequenceControls { display:flex; flex-direction:row; align-items:center; justify-content:center; gap:1.1rem; margin:1.1em 0 0 0; width:100%; }
        #playBtn { min-width:150px; font-size:1.09rem; padding:0.44em 1.4em; border-radius:7px; margin:0; background:#181818; color:#fff; border:2px solid #7af6ff; transition:background .19s,color .19s; box-shadow:0 2px 10px #7af6ff22; }
        #playBtn:hover { background:#212d3d; color:#fff; border-color:#fff; }
        #sampleSequencer { display:flex; flex-direction:column; align-items:center; gap:.6em; margin-top:1.2em; }
        .sample-channel { display:flex; flex-direction:row; align-items:center; gap:.55em; }
        .sample-select { padding:0.28em 0.5em; border-radius:5px; background:#232325; color:#fff; border:1px solid #555; font-size:0.85rem; max-width:170px; cursor:pointer; }
        .sample-steps { display:flex; gap:.42em; }
        .sample-step { width:32px; height:32px; border:1px solid #555; border-radius:5px; background:#232325; display:grid; place-items:center; cursor:pointer; font-size:0.9rem; user-select:none; transition:background .15s, box-shadow .16s, border-color .16s; }
        .sample-step.active { background:#575; box-shadow:0 0 8px #f7c46988; border-color:#7af6ff; }
        .sample-step.playing { border-color:#f7c469; box-shadow:0 0 10px #f7c469cc; }
      </style>
      <div id="sequencer">
        <div id="stepSlots"></div>
        <div id="sampleSequencer"></div>
        <div id="sequenceControls">
          <button id="playBtn">Play Sequence</button>
          <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
          <input type="number" id="stepTimeInput" min="50" max="2000" value="400" style="width:60px;margin-left:0.7em;" />
        </div>
      </div>
    `;
    this._stepSlotsDiv = this.shadowRoot.getElementById('stepSlots');
    this._playBtn = this.shadowRoot.getElementById('playBtn');
    this._stepTimeInput = this.shadowRoot.getElementById('stepTimeInput');
    this._sampleSequencerDiv = this.shadowRoot.getElementById('sampleSequencer');
    this.createSequenceUI();
    this.createSampleUI();
  }

  createSequenceUI() {
    this._stepSlotsDiv.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.classList.add('step-slot');
      slot.dataset.index = i;
      slot.addEventListener('click', () => this.handleStepClick(i));
      slot.addEventListener('contextmenu', (e) => this.handleStepRightClick(e, i));
      this._stepSlotsDiv.appendChild(slot);
    }
    this._playBtn.addEventListener('click', this.handlePlayClick);
    this._stepTimeInput.addEventListener('change', this.handleStepTimeChange);
  }

  createSampleUI() {
    if (!this._sampleSequencerDiv) return;
    this._sampleSequencerDiv.innerHTML = '';
    this._sampleSelects = [];
    this._sampleStepDivs = [];
    for (let c = 0; c < this.state.sampleChannels.length; c++) {
      const chan = document.createElement('div');
      chan.classList.add('sample-channel');
      chan.dataset.channelIndex = c;
      const sel = document.createElement('select');
      sel.classList.add('sample-select');
      sel.dataset.channelIndex = c;
      ogSampleUrls.forEach(({ text }, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = text;
        sel.appendChild(opt);
      });
      sel.value = this.state.sampleChannels[c].sampleIndex;
      sel.addEventListener('change', (e) => {
        const channelIndex = parseInt(e.target.dataset.channelIndex);
        const newIndex = parseInt(e.target.value);
        this.handleSampleChange(channelIndex, newIndex);
      });
      this._sampleSelects.push(sel);
      chan.appendChild(sel);
      const stepsDiv = document.createElement('div');
      stepsDiv.classList.add('sample-steps');
      const stepElems = [];
      for (let s = 0; s < 8; s++) {
        const stepBtn = document.createElement('div');
        stepBtn.classList.add('sample-step');
        stepBtn.dataset.channelIndex = c;
        stepBtn.dataset.stepIndex = s;
        stepBtn.addEventListener('click', () => {
          this.handleSampleStepClick(c, s);
        });
        stepsDiv.appendChild(stepBtn);
        stepElems.push(stepBtn);
      }
      this._sampleStepDivs.push(stepElems);
      chan.appendChild(stepsDiv);
      this._sampleSequencerDiv.appendChild(chan);
    }
  }

  updateSampleUI() {
    if (!this._sampleStepDivs || !this._sampleSelects) return;
    for (let c = 0; c < this.state.sampleChannels.length; c++) {
      const channel = this.state.sampleChannels[c];
      if (this._sampleSelects[c]) {
        this._sampleSelects[c].value = channel.sampleIndex;
      }
      const steps = this._sampleStepDivs[c];
      if (!steps) continue;
      for (let s = 0; s < steps.length; s++) {
        const stepElem = steps[s];
        const isActive = !!channel.steps[s];
        const isPlaying = this.state.sequencePlaying && this.state.sequenceStepIndex === s;
        stepElem.classList.toggle('active', isActive);
        stepElem.classList.toggle('playing', isPlaying);
      }
    }
  }

  handleSampleChange(channelIndex, sampleIndex) {
    if (channelIndex < 0 || channelIndex >= this.state.sampleChannels.length) return;
    this.state.sampleChannels[channelIndex].sampleIndex = sampleIndex;
    this.dispatchEvent(new CustomEvent('seq-sample-selected', {
      detail: { channelIndex, sampleIndex },
      bubbles: true, composed: true
    }));
    this.updateSampleUI();
  }

  handleSampleStepClick(channelIndex, stepIndex) {
    if (channelIndex < 0 || channelIndex >= this.state.sampleChannels.length) return;
    const channel = this.state.sampleChannels[channelIndex];
    if (stepIndex < 0 || stepIndex >= channel.steps.length) return;
    channel.steps[stepIndex] = !channel.steps[stepIndex];
    this.updateSampleUI();
  }

  updateState(newState) {
    Object.assign(this.state, newState);
    this.updateSequenceUI();
    this.updateSampleUI();
  }

  updateSequenceUI() {
    if (!this._stepSlotsDiv) return;
    this._stepSlotsDiv.querySelectorAll('.step-slot').forEach((slot) => {
      const idx = parseInt(slot.dataset.index);
      const val = this.state.sequence[idx];
      slot.textContent = val === 0 ? '0' : (val !== null && val >= 1 && val <= 9 ? val : '');
      slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === idx);
      slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === idx);
    });
    if (this._playBtn) {
      this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
    }
    if (this._stepTimeInput && !this.state.sequencePlaying) {
      this._stepTimeInput.value = this.state.stepTime;
    }
    this.updateSampleUI();
  }

  handleStepClick(index) {
    this.state.isRecording = true;
    this.state.currentRecordSlot = index;
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-record-start', {
      detail: { slotIndex: index },
      bubbles: true, composed: true
    }));
  }

  handleStepRightClick(event, index) {
    event.preventDefault();
    this.state.sequence[index] = null;
    if (this.state.isRecording && this.state.currentRecordSlot === index) {
      this.state.currentRecordSlot = (index + 1) % 8;
      if (this.state.currentRecordSlot === 0) {
        this.state.isRecording = false;
      }
    }
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-step-cleared', {
      detail: { slotIndex: index },
      bubbles: true, composed: true
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
      this.dispatchEvent(new CustomEvent('seq-step-time-changed', {
        detail: { stepTime: this.state.stepTime },
        bubbles: true, composed: true
      }));
    } else {
      this._stepTimeInput.value = this.state.stepTime;
    }
  }

  recordStep(number) {
    const idx = this.state.currentRecordSlot;
    if (!this.state.isRecording || idx < 0 || idx >= this.state.sequence.length) return;
    this.state.sequence[idx] = number;
    this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
    if (this.state.currentRecordSlot === 0) {
      this.state.isRecording = false;
    }
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-step-recorded', {
      detail: {
        slotIndex: idx,
        value: number,
        nextSlot: this.state.currentRecordSlot,
        isRecording: this.state.isRecording
      },
      bubbles: true, composed: true
    }));
  }

  playSequence() {
    if (this.state.sequencePlaying) return;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-play-started', {
      detail: { stepTime: this.state.stepTime },
      bubbles: true, composed: true
    }));
    // NOTE: No local interval/step logic here! All step triggers are parent-controlled.
  }

  stopSequence() {
    if (!this.state.sequencePlaying) return;
    this.state.sequencePlaying = false;
    this.state.sequenceStepIndex = 0;
    this.updateSequenceUI();
    this.dispatchEvent(new CustomEvent('seq-play-stopped', {
      bubbles: true, composed: true
    }));
    // NOTE: No local interval clearing here.
  }
}

customElements.define('seq-app', SeqApp);
