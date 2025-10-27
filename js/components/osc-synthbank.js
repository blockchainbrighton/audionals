class OscSynthBank extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.engines = Array.from({ length: 10 }).map((_, i) => ({ index: i, name: `S${i + 1}` }));
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .bank { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .btn { background: #1b2027; color: #e6edf3; border: 1px solid #2a2f36; border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; }
        .btn:hover { background: #252b34; }
        .name { font-weight: 600; }
        .sub { color: #9aa4ad; font-size: 12px; }
      </style>
      <div class="bank"></div>
    `;
  }

  connectedCallback() {
    this._render();
  }

  setEngines(meta) {
    this.engines = meta.map((m, i) => ({ index: i, name: m.name || `S${i + 1}`, kind: m.kind }));
    this._render();
  }

  _render() {
    const bank = this.shadowRoot.querySelector('.bank');
    bank.innerHTML = '';
    for (const e of this.engines) {
      const btn = document.createElement('div');
      btn.className = 'btn';
      btn.innerHTML = `<div class="name">${e.name}</div><div class="sub">${e.kind || ''}</div>`;
      btn.addEventListener('click', () => this.dispatchEvent(new CustomEvent('preview', { detail: { index: e.index }, bubbles: true })));
      bank.appendChild(btn);
    }
  }
}

customElements.define('osc-synthbank', OscSynthBank);