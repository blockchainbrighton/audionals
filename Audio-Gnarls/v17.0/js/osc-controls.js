/**
 * OscControls - Optimized Controls Component
 */
import { BaseComponent } from './shared/base-component.js';
import { createComponentStyles, createButtonStyle } from './shared/styles.js';
import { clamp01, pct, setText, setPressed, toggleClass, byId, isBool, isNum, setDisabledAll } from './shared/utils.js';

const TXT = {
  pOn: 'POWER ON',
  pOff: 'POWER OFF',
  mute: 'Mute',
  unmute: 'Unmute',
  seqShow: 'Create Sequence',
  seqHide: 'Hide Sequencer',
  sig: 'Audio Signature',
  sigStop: 'Stop Signature',
  loopOn: 'Loop: On',
  loopOff: 'Loop: Off',
  latchOn: 'Latch: On',
  latchOff: 'Latch: Off',
  sigModeOn: 'Signature Mode: On',
  sigModeOff: 'Signature Mode: Off'
};

export class OscControls extends BaseComponent {
  constructor() {
    super();
    this.state = {
      isAudioStarted: false,
      isPlaying: false,
      isMuted: false,
      isAudioSignaturePlaying: false,
      isLoopEnabled: false,
      isSequenceSignatureMode: false,
      isLatchOn: false,
      sequencerVisible: false,
      volume: 10,
      shapeKey: '',
      seed: ''
    };
  }

  onConnected() { this._render(); this._cacheRefs(); this._attachEvents(); }

  _render() {
    const styles = createComponentStyles('osc-controls', `
      #controls{display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap;justify-content:center;padding:.7rem 1.2rem;background:var(--bg-control);border-radius:var(--radius-lg);width:95%;max-width:980px;margin:.9rem auto 0;box-sizing:border-box}
      .seed{display:flex;align-items:center;gap:.55rem;padding:.3rem .55rem;background:var(--bg-secondary);border:1px solid var(--border-secondary);border-radius:var(--radius-lg)}
      .seed label{font-size:.95rem;color:var(--text-accent);letter-spacing:.02em}
      .seed input{font-family:inherit;font-size:.98rem;color:#ffecb3;background:#1c1d22;border:1px solid #3c3f48;border-radius:var(--radius-md);padding:.38rem .55rem;width:15ch;letter-spacing:.04em}
      .seed button{${createButtonStyle('default')}padding:.42rem .8rem;color:var(--text-accent);background:#221;border-color:#665}
      .seed button:hover{background:#2c1f1f}
      .vol{display:flex;align-items:center;gap:.55rem;min-width:190px;padding:.3rem .55rem;background:var(--bg-secondary);border:1px solid var(--border-secondary);border-radius:var(--radius-lg)}
      .vol label{font-size:.95rem;color:var(--text-accent-alt);letter-spacing:.02em}
      .vol input[type="range"]{-webkit-appearance:none;appearance:none;width:140px;height:4px;background:#3a3f4a;border-radius:999px;outline:none}
      .vol input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent-secondary);border:1px solid #2b6b44;box-shadow:0 0 6px rgba(70,173,109,.33);cursor:pointer}
      .vol input[type="range"]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--accent-secondary);border:1px solid #2b6b44;cursor:pointer}
      .vol #volVal{font-size:.92rem;color:var(--text-success);min-width:3.5ch;text-align:right}
      button,select{${createButtonStyle('default')}}
      #startBtn.power-off{background:#451015;color:#e97c90;border-color:#89232a;box-shadow:0 0 4px rgba(255,80,80,.067),0 0 0 transparent;text-shadow:none;filter:brightness(.95)}
      #startBtn.power-on{${createButtonStyle('danger')}filter:brightness(1.1) saturate(1.2)}
      #startBtn:not(.ready){opacity:.7}
      #muteBtn.muted{background:#a51427;color:var(--text-primary);border-color:#ff506e;box-shadow:var(--shadow-glow) rgba(255,80,110,.4);text-shadow:0 1px 2px #320a0b}
      #audioSigBtn{background:#2a4d3a;color:var(--accent-primary);border-color:#4a7c59;box-shadow:var(--shadow-glow) rgba(122,246,255,.2)}
      #audioSigBtn:hover{background:#3a5d4a;box-shadow:var(--shadow-glow) rgba(122,246,255,.33)}
      #audioSigBtn:disabled{background:#1a2d2a;color:#4a6c59;box-shadow:none}
      .toggle{${createButtonStyle('toggle')}}
      #loopBtn.toggle[aria-pressed="true"]{background:#173a2a;border-color:#35d08e;box-shadow:var(--shadow-glow) rgba(53,208,142,.33),inset 0 0 0 1px rgba(53,208,142,.2)}
      #sigModeBtn.toggle[aria-pressed="true"]{background:#1f2a3f;border-color:#7aa2ff;color:#cfe0ff;box-shadow:var(--shadow-glow) rgba(122,162,255,.33),inset 0 0 0 1px rgba(122,162,255,.2)}
      .vol:has(input:disabled){opacity:.5;pointer-events:none}
      @media (max-width:430px){#controls{gap:.5rem;padding:.55rem .8rem}button,select{padding:.42em .8em;font-size:.93rem}.vol{min-width:160px}.vol input[type="range"]{width:120px}.seed input{width:11ch}}
      @media (max-width:380px){#controls{gap:.45rem;padding:.5rem .7rem}button,select{padding:.4em .72em;font-size:.9rem}.vol{min-width:150px}.vol input[type="range"]{width:110px}.seed label{display:none}}
    `);
    this.setStyles(styles);
    this.shadowRoot.innerHTML = `
      <div id="controls">
        <button id="startBtn" title="Click to initialize audio">POWER ON</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect"></select>
        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>
        <button id="latchBtn" class="toggle" aria-pressed="false">Latch: Off</button>
        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>
        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>
        <div id="volWrap" class="vol" title="Master Volume">
          <label for="vol">Vol</label>
          <input id="vol" type="range" min="0" max="100" step="1" value="10" />
          <span id="volVal">10%</span>
        </div>
        <form id="seedForm" class="seed" autocomplete="off">
          <label for="seedInput">Seed</label>
          <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false" />
          <button id="seedSetBtn" type="submit">Set Seed</button>
        </form>
      </div>
    `;
  }

  _cacheRefs() {
    const $ = (s) => this.$(s);
    this._startBtn = $('#startBtn');
    this._muteBtn = $('#muteBtn');
    this._shapeSelect = $('#shapeSelect');
    this._seqBtn = $('#seqBtn');
    this._audioSigBtn = $('#audioSigBtn');
    this._latchBtn = $('#latchBtn');
    this._loopBtn = $('#loopBtn');
    this._sigModeBtn = $('#sigModeBtn');
    this._vol = $('#vol');
    this._volVal = $('#volVal');
    this._seedForm = $('#seedForm');
    this._seedInput = $('#seedInput');
    this._allControls = [this._startBtn, this._muteBtn, this._shapeSelect, this._seqBtn, this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol];
  }

  _attachEvents() {
    const on = (el, t, fn) => this.addEventListeners(el, [[t, fn]]);
    on(this._startBtn, 'click', () => this.emit('start-request'));
    on(this._muteBtn, 'click', () => this.emit('mute-toggle'));
    on(this._seqBtn, 'click', () => this.emit('toggle-sequencer'));
    on(this._audioSigBtn, 'click', () => this.emit('audio-signature'));
    on(this._latchBtn, 'click', () => this.emit('latch-toggle'));
    on(this._loopBtn, 'click', () => this.emit('loop-toggle'));
    on(this._sigModeBtn, 'click', () => this.emit('signature-mode-toggle'));
    on(this._shapeSelect, 'change', () => this.emit('shape-change', { shapeKey: this._shapeSelect.value }));
    on(this._vol, 'input', () => this.emit('volume-change', { value: Number(this._vol.value) }));
    on(this._seedForm, 'submit', (e) => (e.preventDefault(), this.emit('seed-set', { value: (this._seedInput?.value || '').trim() })));
  }

  // === Public API ===
  setShapes(shapes) {
    if (!this._shapeSelect) return;
    const f = document.createDocumentFragment();
    for (const o of shapes ?? []) f.appendChild(this.createElement('option', { value: o.value }, { textContent: o.label }));
    this._shapeSelect.replaceChildren(f);
  }

  setSeed(seed) { this._seedInput && (this._seedInput.value = seed ?? ''); }

  disableAll(disabled) { setDisabledAll(this._allControls, disabled); }

  updateState(newState = {}) { super.updateState(newState, false); this._updateUI(); }

  _updateUI() {
    const s = this.state, T = (b, on, a, d) => (setPressed(b, on), setText(b, on ? a : d));
    isBool(s.isAudioSignaturePlaying) && T(this._audioSigBtn, s.isAudioSignaturePlaying, TXT.sigStop, TXT.sig);
    if (isBool(s.isPlaying)) {
      setText(this._startBtn, s.isPlaying ? TXT.pOff : TXT.pOn);
      toggleClass(this._startBtn, 'power-on', !!s.isPlaying);
      toggleClass(this._startBtn, 'power-off', !s.isPlaying);
    }
    if (isBool(s.isAudioStarted)) {
      toggleClass(this._startBtn, 'ready', !!s.isAudioStarted);
      setDisabledAll([this._muteBtn, this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol], !s.isAudioStarted);
    }
    if (isBool(s.isMuted)) { setText(this._muteBtn, s.isMuted ? TXT.unmute : TXT.mute); toggleClass(this._muteBtn, 'muted', !!s.isMuted); }
    s.shapeKey && this._shapeSelect && (this._shapeSelect.value = s.shapeKey);
    isBool(s.sequencerVisible) && setText(this._seqBtn, s.sequencerVisible ? TXT.seqHide : TXT.seqShow);
    isBool(s.isLoopEnabled) && T(this._loopBtn, s.isLoopEnabled, TXT.loopOn, TXT.loopOff);
    isBool(s.isSequenceSignatureMode) && T(this._sigModeBtn, s.isSequenceSignatureMode, TXT.sigModeOn, TXT.sigModeOff);
    isBool(s.isLatchOn) && T(this._latchBtn, s.isLatchOn, TXT.latchOn, TXT.latchOff);
    if (isNum(s.volume)) {
      const p = pct(s.volume);
      this._vol && (this._vol.value = String(p));
      this._volVal && (this._volVal.textContent = `${p}%`);
    }
    isBool(s.sequencerVisible) && this.emit('controls-resize');
  }
}

customElements.define('osc-controls', OscControls);
