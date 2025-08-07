// step-sequencer.js

class StepSequencer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.steps = Array(8).fill(null); // Stores mode values (e.g., 'radial', 'polygon', etc.)
      this.isPlaying = false;
      this.isRecording = false;
      this.currentIndex = 0;
      this.intervalId = null;
      this.bpm = 120;
      this._recordBuffer = []; // Temporary buffer during recording
  
      this._render();
    }
  
    _render() {
      const shadow = this.shadowRoot;
      shadow.innerHTML = `
        <style>
          :host {
            display: block;
            margin: 1rem auto;
            max-width: 800px;
            text-align: center;
            font-family: 'Arial', sans-serif;
            color: #eee;
          }
          .controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-bottom: 0.8rem;
            flex-wrap: wrap;
          }
          .steps {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 0.6rem;
          }
          .step {
            width: 40px;
            height: 40px;
            background: #222;
            border: 1px solid #444;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #aaa;
            font-size: 0.9rem;
          }
          .step.filled {
            background: #3a6;
            color: white;
            border-color: #5c8;
          }
          .step.active {
            background: #6af;
            color: white;
            box-shadow: 0 0 8px rgba(100, 200, 255, 0.6);
          }
          button {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            border: 1px solid #666;
            background: linear-gradient(to bottom, #333, #222);
            color: #eee;
            cursor: pointer;
            transition: 0.2s;
          }
          button:hover {
            background: linear-gradient(to bottom, #444, #333);
            box-shadow: 0 0 6px rgba(100, 150, 255, 0.4);
          }
          button:active {
            transform: translateY(1px);
          }
          button.recording {
            background: linear-gradient(to bottom, #a33, #700);
            box-shadow: 0 0 10px rgba(255, 60, 60, 0.5);
          }
          input[type="number"] {
            width: 60px;
            padding: 0.5rem;
            border-radius: 4px;
            border: 1px solid #555;
            background: #222;
            color: #eee;
            text-align: center;
          }
          .label {
            font-size: 0.85rem;
            color: #aaa;
          }
        </style>
  
        <div class="controls">
          <button id="recordBtn">Record</button>
          <button id="playBtn" disabled>Play</button>
          <div>
            <input type="number" id="bpmInput" value="120" min="40" max="240" />
            <div class="label">BPM</div>
          </div>
        </div>
  
        <div class="steps">
          ${Array(8)
            .fill()
            .map((_, i) => `<div class="step" data-index="${i}">-</div>`)
            .join('')}
        </div>
      `;
  
      // Cache elements
      this.recordBtn = shadow.getElementById('recordBtn');
      this.playBtn = shadow.getElementById('playBtn');
      this.bpmInput = shadow.getElementById('bpmInput');
      this.stepElements = shadow.querySelectorAll('.step');
  
      // Event listeners
      this.recordBtn.addEventListener('click', () => this._toggleRecord());
      this.playBtn.addEventListener('click', () => this._togglePlay());
      this.bpmInput.addEventListener('change', () => {
        this.bpm = parseInt(this.bpmInput.value, 10) || 120;
      });
    }
  
    /**
     * Call this method when a mode is selected externally (e.g., from OscControls).
     * If recording, capture the mode into the buffer.
     */
    captureMode(mode) {
      if (this.isRecording && this._recordBuffer.length < 8) {
        this._recordBuffer.push(mode);
        // Update UI step
        const stepEl = this.stepElements[this._recordBuffer.length - 1];
        stepEl.textContent = this._modeToDigit(mode);
        stepEl.classList.add('filled');
        if (this._recordBuffer.length === 8) {
          this._stopRecording();
        }
      }
    }
  
    _toggleRecord() {
      if (this.isRecording) {
        this._stopRecording();
      } else {
        this._startRecording();
      }
    }
  
    _startRecording() {
      this.isRecording = true;
      this._recordBuffer = [];
      this.recordBtn.classList.add('recording');
      this.recordBtn.textContent = 'Stop Recording';
      this.playBtn.disabled = true;
  
      // Clear UI
      this.stepElements.forEach(el => {
        el.textContent = '-';
        el.classList.remove('filled', 'active');
      });
  
      this.dispatchEvent(new CustomEvent('sequence-record-start', {
        bubbles: true,
        composed: true
      }));
    }
  
    _stopRecording() {
      this.isRecording = false;
      this.recordBtn.classList.remove('recording');
      this.recordBtn.textContent = 'Record';
      this.steps = [...this._recordBuffer, ...Array(8 - this._recordBuffer.length).fill(null)];
      this.playBtn.disabled = this._recordBuffer.length === 0;
  
      this.dispatchEvent(new CustomEvent('sequence-recorded', {
        bubbles: true,
        composed: true,
        detail: { sequence: this.steps.filter(Boolean) }
      }));
    }
  
    _togglePlay() {
      if (this.isPlaying) {
        this._stopPlayback();
      } else {
        this._startPlayback();
      }
    }
  
    _startPlayback() {
      if (this.steps.every(step => !step)) return;
  
      this.isPlaying = true;
      this.playBtn.textContent = 'Stop';
      this.currentIndex = 0;
      this.dispatchEvent(new CustomEvent('sequence-start', {
        bubbles: true,
        composed: true,
        detail: { bpm: this.bpm }
      }));
  
      const intervalMs = (60 * 1000) / this.bpm / 2; // 8 steps = 4 beats (half-note per step)
  
      this.intervalId = setInterval(() => {
        const step = this.steps[this.currentIndex];
        if (step) {
          this.dispatchEvent(new CustomEvent('step-trigger', {
            bubbles: true,
            composed: true,
            detail: { index: this.currentIndex, mode: step }
          }));
  
          // Visual feedback
          const stepEl = this.stepElements[this.currentIndex];
          stepEl.classList.add('active');
          setTimeout(() => {
            if (stepEl) stepEl.classList.remove('active');
          }, intervalMs - 100);
        }
  
        this.currentIndex = (this.currentIndex + 1) % this.steps.length;
      }, intervalMs);
    }
  
    _stopPlayback() {
      this.isPlaying = false;
      this.playBtn.textContent = 'Play';
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.dispatchEvent(new CustomEvent('sequence-stop', {
        bubbles: true,
        composed: true
      }));
    }
  
    // Helper to map mode to a single digit (for display)
    _modeToDigit(mode) {
      const modeMap = {
        radial: '0', polygon: '1', layers: '2', particles: '3', spiral: '4',
        waveform: '5', starburst: '6', ripple: '7', orbit: '8', fractal: '9'
      };
      return modeMap[mode] || '?';
    }
  
    // Optional: Reset the sequence
    clear() {
      this.steps = Array(8).fill(null);
      this._recordBuffer = [];
      this.stepElements.forEach(el => {
        el.textContent = '-';
        el.classList.remove('filled', 'active');
      });
      this.playBtn.disabled = true;
    }
  }
  
  customElements.define('step-sequencer', StepSequencer);