import { rngFromSeed, pickScale, generateDemoPattern } from '../seed.js';
import { paletteFromSeed, downloadText } from '../utils.js';
import { createSynthEngines } from '../synthEngine.js';
import { SequencerCore } from '../sequencerCore.js';

const TONE_JS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; }
        @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
        .card { background: #12151a; border: 1px solid #1b2027; border-radius: 10px; padding: 12px; }
        .title { color: #9aa4ad; font-size: 12px; margin-bottom: 8px; }
      </style>
      <div class="layout">
        <div class="card">
          <div class="title">Oscilloscope</div>
          <osc-scope id="scope"></osc-scope>
        </div>
        <div class="card">
          <div class="title">Controls</div>
          <osc-controls id="controls"></osc-controls>
          <div style="height:8px"></div>
          <div class="title">Synth Bank</div>
          <osc-synthbank id="bank"></osc-synthbank>
        </div>
        <div class="card" style="grid-column: 1 / -1;">
          <div class="title">Sequencer (10 x 16)</div>
          <osc-sequencer id="seq" steps="16" tracks="10"></osc-sequencer>
        </div>
      </div>
    `;

    this.state = {
      seed: 'osc-seed-demo',
      rng: null,
      palette: null,
      Tone: null,
      scaleInfo: null,
      engines: null,
      audio: null,
      sequencer: null,
      pattern: null,
    };
  }

  connectedCallback() {
    this._wireUi();
    this._bootstrap();
  }

  async _bootstrap() {
    const seed = new URLSearchParams(location.search).get('seed') || this.state.seed;
    await this._loadTone();
    this.setSeed(seed);

    // Expose Public API
    window.oscApp = {
      setSeed: (s) => this.setSeed(s),
      playDemo: () => this.play(),
      stop: () => this.stop(),
      exportPattern: () => this._export(),
      getPattern: () => JSON.parse(JSON.stringify(this.state.pattern)),
      setPattern: (grid) => this._setPattern(grid),
    };
  }

  async _loadTone() {
    if (window.Tone) { this.state.Tone = window.Tone; return; }
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = TONE_JS_URL;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    this.state.Tone = window.Tone;
  }

  _wireUi() {
    const controls = this.shadowRoot.getElementById('controls');
    const seq = this.shadowRoot.getElementById('seq');
    const bank = this.shadowRoot.getElementById('bank');
    const scope = this.shadowRoot.getElementById('scope');

    controls.addEventListener('set-seed', (e) => this.setSeed(e.detail.seed));
    controls.addEventListener('set-bpm', (e) => this._setBpm(e.detail.bpm));
    controls.addEventListener('play', () => this.play());
    controls.addEventListener('stop', () => this.stop());
    controls.addEventListener('export', () => this._export());

    seq.addEventListener('toggle-step', (e) => {
      const { track, step } = e.detail;
      this.state.pattern[track][step] = !this.state.pattern[track][step];
      seq.setPattern(this.state.pattern);
    });

    bank.addEventListener('preview', async (e) => {
      const idx = e.detail.index;
      const { Tone } = this.state;
      await Tone.start();
      const when = `+0.02`;
      this.state.engines[idx].trigger({ time: when, degree: idx % this.state.scaleInfo.steps.length, length: '8n', velocity: 0.9 });
      Tone.Draw.schedule(() => scope.setRecipe(this.state.engines[idx].recipe), Tone.now());
    });
  }

  _setupAudio(seed) {
    const rng = rngFromSeed(seed);
    const scaleInfo = pickScale(rng);
    const Tone = this.state.Tone;
    const { engines, master, analyser } = createSynthEngines(Tone, rng, scaleInfo);
    this.state.rng = rng;
    this.state.scaleInfo = scaleInfo;
    this.state.engines = engines;
    this.state.audio = { master, analyser };

    const scope = this.shadowRoot.getElementById('scope');
    scope.setAnalyser(analyser);
    scope.setActive(true);

    const meta = engines.map((e, i) => ({ name: `S${i + 1}`, kind: e.kind }));
    this.shadowRoot.getElementById('bank').setEngines(meta);

    this._setupSequencer();
    this._applyBpm(scaleInfo.bpm);
  }

  _setupSequencer() {
    const { Tone, engines, scaleInfo } = this.state;
    const scope = this.shadowRoot.getElementById('scope');

    if (this.state.sequencer) this.state.sequencer.stop();
    const sequencer = new SequencerCore({ Tone, engines, scaleInfo, steps: 16, onTrigger: (track, recipe) => scope.setRecipe(recipe) });
    this.state.sequencer = sequencer;
  }

  _applyBpm(bpm) {
    this.state.Tone.Transport.bpm.value = bpm;
    this.shadowRoot.getElementById('controls').setBpm(bpm);
  }

  _setBpm(bpm) {
    this._applyBpm(bpm);
  }

  _setPattern(grid) {
    this.state.pattern = grid.map(r => r.slice());
    this.shadowRoot.getElementById('seq').setPattern(this.state.pattern);
    this.state.sequencer.setPattern(this.state.pattern);
  }

  setSeed(seed) {
    this.state.seed = seed || 'osc-seed-demo';
    history.replaceState({}, '', `${location.pathname}?seed=${encodeURIComponent(this.state.seed)}`);

    // Regenerate everything deterministically
    this._setupAudio(this.state.seed);

    // Demo pattern
    const demo = generateDemoPattern(this.state.rng, 10, 16);
    this._setPattern(demo);

    // Set controls
    this.shadowRoot.getElementById('controls').setSeed(this.state.seed);
  }

  async play() {
    await this.state.Tone.start();
    this.state.sequencer.setPattern(this.state.pattern);
    this.state.sequencer.start(this.state.Tone.Transport.bpm.value);
  }

  stop() {
    this.state.sequencer.stop();
  }

  _export() {
    const payload = {
      seed: this.state.seed,
      bpm: this.state.Tone.Transport.bpm.value,
      scale: this.state.scaleInfo,
      pattern: this.state.pattern,
      synths: this.state.engines.map((e) => ({ kind: e.kind, recipe: e.recipe })),
      version: window.__OSC_SEED_AV_VERSION__ || '0.1.0',
    };
    downloadText(`osc-seed-${this.state.seed}.json`, JSON.stringify(payload, null, 2));
  }
}

customElements.define('osc-app', OscApp);