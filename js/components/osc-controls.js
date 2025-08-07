class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        input[type="text"] { background: #0f1318; color: #e6edf3; border: 1px solid #1b2027; padding: 8px 10px; border-radius: 8px; min-width: 220px; }
        input[type="range"] { width: 180px; }
        button { background: #1b2027; color: #e6edf3; border: 1px solid #2a2f36; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
        button:hover { background: #252b34; }
        label { color: #9aa4ad; font-size: 12px; }
        .pill { padding: 6px 10px; border-radius: 999px; background: #12151a; border: 1px solid #1b2027; color: #9aa4ad; }
      </style>
      <div class="row">
        <label>Seed</label>
        <input id="seed" type="text" placeholder="enter seed" />
        <button id="apply">Apply</button>
        <span class="pill">BPM: <span id="bpmv">120</span></span>
        <input id="bpm" type="range" min="70" max="180" value="120" />
        <button id="play">Play</button>
        <button id="stop">Stop</button>
        <button id="export">Export</button>
      </div>
    `;
  }

  connectedCallback() {
    const seedI = this.shadowRoot.getElementById('seed');
    const bpmI = this.shadowRoot.getElementById('bpm');
    const bpmv = this.shadowRoot.getElementById('bpmv');

    this.shadowRoot.getElementById('apply').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('set-seed', { detail: { seed: seedI.value }, bubbles: true }));
    });
    bpmI.addEventListener('input', () => {
      bpmv.textContent = bpmI.value;
      this.dispatchEvent(new CustomEvent('set-bpm', { detail: { bpm: Number(bpmI.value) }, bubbles: true }));
    });
    this.shadowRoot.getElementById('play').addEventListener('click', () => this.dispatchEvent(new CustomEvent('play', { bubbles: true })));
    this.shadowRoot.getElementById('stop').addEventListener('click', () => this.dispatchEvent(new CustomEvent('stop', { bubbles: true })));
    this.shadowRoot.getElementById('export').addEventListener('click', () => this.dispatchEvent(new CustomEvent('export', { bubbles: true })));
  }

  setSeed(seed) { this.shadowRoot.getElementById('seed').value = seed; }
  setBpm(bpm) {
    const bpmI = this.shadowRoot.getElementById('bpm');
    const bpmv = this.shadowRoot.getElementById('bpmv');
    bpmI.value = String(Math.round(bpm));
    bpmv.textContent = String(Math.round(bpm));
  }
}

customElements.define('osc-controls', OscControls);