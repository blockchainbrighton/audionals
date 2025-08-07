class OscSequencer extends HTMLElement {
  static get observedAttributes() { return ['steps', 'tracks']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.steps = Number(this.getAttribute('steps') || 16);
    this.tracks = Number(this.getAttribute('tracks') || 10);
    this.pattern = Array.from({ length: this.tracks }, () => Array(this.steps).fill(false));
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .grid { display: grid; grid-template-columns: 32px repeat(var(--steps), 1fr); gap: 4px; }
        .row { display: contents; }
        .label { display: flex; align-items: center; justify-content: center; color: #9aa4ad; font-size: 12px; }
        .cell { height: 26px; border-radius: 6px; border: 1px solid #1b2027; background: #2a2f36; cursor: pointer; }
        .cell.on { background: #a6e22e; border-color: #a6e22e; }
        .cell:hover { filter: brightness(1.08); }
        .head { display: grid; grid-template-columns: 32px repeat(var(--steps), 1fr); gap: 4px; margin-bottom: 4px; }
        .stepn { text-align: center; color: #9aa4ad; font-size: 11px; }
      </style>
      <div class="head"></div>
      <div class="grid"></div>
    `;
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback(name, _o, _n) {
    if (name === 'steps' || name === 'tracks') {
      this.steps = Number(this.getAttribute('steps') || 16);
      this.tracks = Number(this.getAttribute('tracks') || 10);
      this.pattern = Array.from({ length: this.tracks }, () => Array(this.steps).fill(false));
      this._render();
    }
  }

  setPattern(grid) {
    this.tracks = grid.length;
    this.steps = grid[0]?.length || 16;
    this.pattern = grid.map(r => r.slice());
    this._render();
  }

  _render() {
    const root = this.shadowRoot;
    root.host.style.setProperty('--steps', String(this.steps));

    const head = root.querySelector('.head');
    head.innerHTML = '';
    head.appendChild(this._elt('div', ''));
    for (let s = 0; s < this.steps; s++) {
      const el = this._elt('div', String((s + 1)));
      el.className = 'stepn';
      head.appendChild(el);
    }

    const grid = root.querySelector('.grid');
    grid.innerHTML = '';
    for (let t = 0; t < this.tracks; t++) {
      const lab = this._elt('div', String(t + 1));
      lab.className = 'label';
      grid.appendChild(lab);
      for (let s = 0; s < this.steps; s++) {
        const on = !!this.pattern[t]?.[s];
        const cell = this._elt('div', '');
        cell.className = `cell${on ? ' on' : ''}`;
        cell.dataset.t = String(t);
        cell.dataset.s = String(s);
        cell.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('toggle-step', { detail: { track: t, step: s }, bubbles: true }));
        });
        grid.appendChild(cell);
      }
    }
  }

  _elt(tag, text) { const e = document.createElement(tag); e.textContent = text; return e; }
}

customElements.define('osc-sequencer', OscSequencer);