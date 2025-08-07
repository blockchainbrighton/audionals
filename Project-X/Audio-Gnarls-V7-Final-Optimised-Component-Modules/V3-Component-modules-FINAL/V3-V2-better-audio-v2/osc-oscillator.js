// Encapsulates the audio oscillator controls.  Two oscillators are
// represented with selectable waveform types and musical notes.  Changes to
// these controls emit an `osc-params` event describing the current
// selections so that the orchestrator can update the audio graph.  The
// second oscillator can be enabled or disabled via a checkbox; when
// disabled its parameters are omitted from the event detail.

class OscOscillator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Define available oscillator types and musical notes.  These mirror the
    // arrays used in the original deterministic preset generator.  Should
    // additional types or notes be desired, they can be added here.
    this.types = ['sine', 'triangle', 'square', 'sawtooth'];
    this.notes = [
      'C1',
      'C2',
      'E2',
      'G2',
      'A2',
      'C3',
      'E3',
      'G3',
      'B3',
      'D4',
      'F#4',
      'A4',
      'C5',
    ];
    // Build the UI.  Each oscillator section contains two selects and a
    // checkbox controlling the second oscillator's activation.
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: #111;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 0.5rem;
          color: #fff;
          font-size: 0.9rem;
          max-width: 600px;
        }
        .osc-section {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        label {
          margin-right: 0.3rem;
        }
        select, input[type="checkbox"] {
          padding: 0.3rem;
          border-radius: 4px;
          border: 1px solid #555;
          background: #222;
          color: #fff;
        }
      </style>
      <div class="osc-section" id="osc1Section">
        <label>Osc1 Type:</label>
        <select id="osc1Type"></select>
        <label>Osc1 Note:</label>
        <select id="osc1Note"></select>
      </div>
      <div class="osc-section" id="osc2Section">
        <label>Osc2 Type:</label>
        <select id="osc2Type"></select>
        <label>Osc2 Note:</label>
        <select id="osc2Note"></select>
        <label><input type="checkbox" id="osc2Enable" /> Enable Osc2</label>
      </div>
    `;
    // References to DOM elements.
    this.osc1Type = this.shadowRoot.getElementById('osc1Type');
    this.osc1Note = this.shadowRoot.getElementById('osc1Note');
    this.osc2Type = this.shadowRoot.getElementById('osc2Type');
    this.osc2Note = this.shadowRoot.getElementById('osc2Note');
    this.osc2Enable = this.shadowRoot.getElementById('osc2Enable');
  }

  connectedCallback() {
    // Populate the selects with type and note options.
    this._populateSelect(this.osc1Type, this.types);
    this._populateSelect(this.osc1Note, this.notes);
    this._populateSelect(this.osc2Type, this.types);
    this._populateSelect(this.osc2Note, this.notes);
    // Default selections correspond to the first entries.
    this.osc1Type.value = this.types[0];
    this.osc1Note.value = this.notes[0];
    this.osc2Type.value = this.types[0];
    this.osc2Note.value = this.notes[0];
    this.osc2Enable.checked = false;
    // Attach change listeners to propagate parameter updates.
    const handler = () => this._emitParams();
    this.osc1Type.addEventListener('change', handler);
    this.osc1Note.addEventListener('change', handler);
    this.osc2Type.addEventListener('change', handler);
    this.osc2Note.addEventListener('change', handler);
    this.osc2Enable.addEventListener('change', handler);
    // Emit initial parameters so the orchestrator knows the starting state.
    this._emitParams();
  }

  /**
   * Populate a select element with an array of option values.  The text
   * displayed in each option is identical to its value.
   * @param {HTMLSelectElement} sel
   * @param {string[]} values
   */
  _populateSelect(sel, values) {
    sel.innerHTML = '';
    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    }
  }

  /**
   * Emit the current oscillator parameters in response to any control
   * change.  The detail object matches the format used in the original
   * deterministic presets: an array of [type, note] pairs for each
   * oscillator.  The second oscillator is omitted when disabled.
   */
  _emitParams() {
    const osc1 = [this.osc1Type.value, this.osc1Note.value];
    let osc2 = null;
    if (this.osc2Enable.checked) {
      osc2 = [this.osc2Type.value, this.osc2Note.value];
    }
    this.dispatchEvent(
      new CustomEvent('osc-params', {
        detail: { osc1, osc2 },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Update the UI based on a preset structure.  When a preset defines
   * osc1/osc2 arrays they are used to select the appropriate options.
   * Presets with null osc2 disable the second oscillator.
   * @param {Object} preset
   */
  setParams(preset) {
    if (!preset || !preset.osc1) return;
    const [t1, n1] = preset.osc1;
    if (this.types.includes(t1)) this.osc1Type.value = t1;
    if (this.notes.includes(n1)) this.osc1Note.value = n1;
    if (preset.osc2) {
      const [t2, n2] = preset.osc2;
      this.osc2Enable.checked = true;
      if (this.types.includes(t2)) this.osc2Type.value = t2;
      if (this.notes.includes(n2)) this.osc2Note.value = n2;
    } else {
      this.osc2Enable.checked = false;
    }
    // Emit updated params to synchronise with the orchestrator.
    this._emitParams();
  }
}

customElements.define('osc-oscillator', OscOscillator);