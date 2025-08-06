// osc-sequencer.js
// This component provides the UI for the step sequencer.
// It is stateless and communicates via events.
// It expects sequence data and state via attributes/properties and
// dispatches events for user interactions.

class OscSequencer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
  
      // Define shapes order and mapping for sequencer keys (1–6)
      // These are duplicated from OscApp2 for self-containment of UI logic
      this.shapes = ['circle', 'square', 'butterfly', 'lissajous', 'spiro', 'harmonograph'];
      this.shapeLabels = {
        circle: 'Circle',
        square: 'Square',
        butterfly: 'Butterfly',
        lissajous: 'Lissajous',
        spiro: 'Spirograph',
        harmonograph: 'Harmonograph'
      };
  
      // Bind internal event handlers
      this._handleStepClick = this._handleStepClick.bind(this);
      this._handleStepContextMenu = this._handleStepContextMenu.bind(this);
      this._handlePlayClick = this._handlePlayClick.bind(this);
      this._handleStepTimeChange = this._handleStepTimeChange.bind(this);
    }
  
    static get observedAttributes() {
      return ['sequence', 'is-recording', 'current-record-slot', 'sequence-playing', 'sequence-step-index', 'step-time'];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      // console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`); // Debugging
      if (oldValue !== newValue) {
        this.updateUI();
      }
    }
  
    connectedCallback() {
      this.render();
      this.updateUI(); // Initial UI update based on attributes/properties
      this.attachEventListeners();
    }
  
    disconnectedCallback() {
      this.detachEventListeners();
    }
  
    render() {
      const wrapper = document.createElement('div');
      wrapper.id = 'sequencerWrapper';
  
      // Container for step slots
      this._stepSlotsDiv = document.createElement('div');
      this._stepSlotsDiv.id = 'stepSlots';
  
      // Sequence controls
      const seqControlsDiv = document.createElement('div');
      seqControlsDiv.id = 'sequenceControls';
  
      this._playBtn = document.createElement('button');
      this._playBtn.id = 'playBtn';
      this._playBtn.textContent = 'Play Sequence'; // Initial text
  
      const stepTimeLabel = document.createElement('label');
      stepTimeLabel.setAttribute('for', 'stepTimeInput');
      stepTimeLabel.style.marginLeft = '1.2em';
      stepTimeLabel.textContent = 'Step Time (ms):';
  
      this._stepTimeInput = document.createElement('input');
      this._stepTimeInput.type = 'number';
      this._stepTimeInput.id = 'stepTimeInput';
      this._stepTimeInput.min = '50';
      this._stepTimeInput.max = '2000';
      this._stepTimeInput.style.width = '60px';
      // Value will be set by updateUI
  
      seqControlsDiv.append(this._playBtn, stepTimeLabel, this._stepTimeInput);
      wrapper.append(this._stepSlotsDiv, seqControlsDiv);
  
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
          display: inline-block;
        }
      `;
  
      this.shadowRoot.append(style, wrapper);
      this.createSequenceSlots(); // Create the initial 8 slots
    }
  
    // Creates the 8 step slot elements
    createSequenceSlots() {
      this._stepSlotsDiv.innerHTML = ''; // Clear existing
      for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.classList.add('step-slot');
        slot.dataset.index = i.toString();
        // Text content and classes are set by updateUI
        slot.addEventListener('click', this._handleStepClick);
        slot.addEventListener('contextmenu', this._handleStepContextMenu);
        this._stepSlotsDiv.appendChild(slot);
      }
    }
  
    attachEventListeners() {
      if (this._playBtn) {
        this._playBtn.addEventListener('click', this._handlePlayClick);
      }
      if (this._stepTimeInput) {
        this._stepTimeInput.addEventListener('change', this._handleStepTimeChange);
      }
    }
  
    detachEventListeners() {
      if (this._playBtn) {
        this._playBtn.removeEventListener('click', this._handlePlayClick);
      }
      if (this._stepTimeInput) {
        this._stepTimeInput.removeEventListener('change', this._handleStepTimeChange);
      }
      // Remove listeners from slots if needed, though they are recreated
      const slots = this._stepSlotsDiv?.querySelectorAll('.step-slot') || [];
      slots.forEach(slot => {
        slot.removeEventListener('click', this._handleStepClick);
        slot.removeEventListener('contextmenu', this._handleStepContextMenu);
      });
    }
  
    // --- Property Getters/Setters for Attributes ---
    // These help manage the component's state representation via attributes.
  
    get sequence() {
      const attr = this.getAttribute('sequence');
      if (attr) {
        try {
          // Assumes sequence is stored as a JSON string in the attribute
          return JSON.parse(attr);
        } catch (e) {
          console.error("Failed to parse sequence attribute:", e);
          return Array(8).fill(null);
        }
      }
      return Array(8).fill(null);
    }
    set sequence(val) {
      if (Array.isArray(val) && val.length === 8) {
        this.setAttribute('sequence', JSON.stringify(val));
      } else {
        console.warn("Invalid sequence set, must be an array of length 8");
      }
    }
  
    get isRecording() {
      return this.hasAttribute('is-recording');
    }
    set isRecording(val) {
      if (val) {
        this.setAttribute('is-recording', '');
      } else {
        this.removeAttribute('is-recording');
      }
    }
  
    get currentRecordSlot() {
      const val = this.getAttribute('current-record-slot');
      return val !== null ? parseInt(val, 10) : -1;
    }
    set currentRecordSlot(val) {
      if (typeof val === 'number' && val >= -1 && val < 8) {
        this.setAttribute('current-record-slot', val.toString());
      } else {
        this.removeAttribute('current-record-slot');
      }
    }
  
    get sequencePlaying() {
      return this.hasAttribute('sequence-playing');
    }
    set sequencePlaying(val) {
      if (val) {
        this.setAttribute('sequence-playing', '');
      } else {
        this.removeAttribute('sequence-playing');
      }
    }
  
    get sequenceStepIndex() {
      const val = this.getAttribute('sequence-step-index');
      return val !== null ? parseInt(val, 10) : 0;
    }
    set sequenceStepIndex(val) {
      if (typeof val === 'number' && val >= 0 && val < 8) {
        this.setAttribute('sequence-step-index', val.toString());
      } else {
        this.setAttribute('sequence-step-index', '0'); // Default or remove?
      }
    }
  
    get stepTime() {
      const val = this.getAttribute('step-time');
      const numVal = val !== null ? parseInt(val, 10) : 400;
      return isNaN(numVal) ? 400 : numVal;
    }
    set stepTime(val) {
      const numVal = parseInt(val, 10);
      if (!isNaN(numVal) && numVal >= 50 && numVal <= 2000) {
        this.setAttribute('step-time', numVal.toString());
      } else {
         this.setAttribute('step-time', '400'); // Default or remove?
      }
    }
  
    // --- Internal Event Handlers ---
  
    _handleStepClick(event) {
      const slot = event.currentTarget;
      const index = parseInt(slot.dataset.index, 10);
      if (!isNaN(index)) {
        // Dispatch event for parent to handle recording state logic
        this.dispatchEvent(new CustomEvent('sequencer-step-select', { detail: { index }, bubbles: true, composed: true }));
      }
    }
  
    _handleStepContextMenu(event) {
      event.preventDefault();
      const slot = event.currentTarget;
      const index = parseInt(slot.dataset.index, 10);
      if (!isNaN(index)) {
        // Dispatch event for parent to handle clearing logic
        this.dispatchEvent(new CustomEvent('sequencer-step-clear', { detail: { index }, bubbles: true, composed: true }));
      }
    }
  
    _handlePlayClick() {
      // Dispatch event for parent to handle play/stop logic
      this.dispatchEvent(new CustomEvent('sequencer-toggle-play', { bubbles: true, composed: true }));
    }
  
    _handleStepTimeChange() {
      const inputValue = parseInt(this._stepTimeInput.value, 10);
      if (!isNaN(inputValue) && inputValue >= 50 && inputValue <= 2000) {
        // Dispatch event for parent to handle step time update logic
        this.dispatchEvent(new CustomEvent('sequencer-step-time-change', { detail: { stepTime: inputValue }, bubbles: true, composed: true }));
      } else {
        // Revert input if invalid
        this._stepTimeInput.value = this.stepTime;
      }
    }
  
  
    // --- UI Update Logic ---
  
    // Reads state from attributes/properties and updates the UI elements
    updateUI() {
      const sequence = this.sequence;
      const isRecording = this.isRecording;
      const currentRecordSlot = this.currentRecordSlot;
      const sequencePlaying = this.sequencePlaying;
      const sequenceStepIndex = this.sequenceStepIndex;
      const stepTime = this.stepTime;
  
      // Update step slots
      const slots = this._stepSlotsDiv.querySelectorAll('.step-slot');
      slots.forEach((slot, i) => {
        const val = sequence[i];
        slot.textContent = val ? val.toString() : '';
        slot.classList.toggle('record-mode', isRecording && currentRecordSlot === i);
        slot.classList.toggle('active', sequencePlaying && sequenceStepIndex === i);
      });
  
      // Update play button text
      if (this._playBtn) {
        this._playBtn.textContent = sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
      }
  
      // Update step time input
      if (this._stepTimeInput) {
         this._stepTimeInput.value = stepTime.toString();
      }
    }
  }
  
  customElements.define('osc-sequencer', OscSequencer);