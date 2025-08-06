// This component encapsulates the control surface for the oscilloscope
// synthesizer. It exposes buttons for starting/regenerating the
// experience, muting/unmuting audio and selecting a visualisation mode.
// It lazily loads Tone.js via an embedded <tone-loader> and enables
// itself once the engine is ready. CustomEvents are emitted for
// `start-request`, `mode-change` and `mute-toggle` to decouple the
// UI from the application logic. The orchestrator should call
// setPlaying(true|false) to reflect the current playback state.
class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Internal state tracking whether the destination is muted.
    this._muted = false;
    this._playing = false;
    this._render();
  }

  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';
    // Styles mirror the original index.html while keeping them scoped to
    // this component via shadow DOM. Pseudo-classes (hover/active) are
    // supported natively inside a shadow tree.
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: grid;
        gap: 0.5rem;
        justify-items: center;
      }
      #controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
      }
      button, select {
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        border: 1px solid #666;
        background: linear-gradient(to bottom, #333, #222);
        color: #eee;
        font-weight: 500;
        cursor: pointer;
        transition: 0.2s;
      }
      button:hover, select:hover {
        background: linear-gradient(to bottom, #444, #333);
        border-color: #888;
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.3);
      }
      button:active {
        transform: translateY(1px);
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        cursor: default;
      }
      #loader {
        font-size: 1rem;
        color: #aaa;
        min-height: 1.4rem;
        text-align: center;
        font-style: italic;
      }
      #info {
        font-size: 0.85rem;
        color: #888;
        text-align: center;
        max-width: 90%;
      }
    `;
    shadow.appendChild(style);

    // Container for the buttons and select.
    const container = document.createElement('div');
    container.id = 'controls';
    
    // Start/Regenerate button
    this.startBtn = document.createElement('button');
    this.startBtn.textContent = 'Generate New Experience';
    this.startBtn.disabled = true;
    this.startBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
    });
    container.appendChild(this.startBtn);

    // Mute/Unmute button
    this.muteBtn = document.createElement('button');
    this.muteBtn.textContent = 'Mute';
    this.muteBtn.disabled = true;
    this.muteBtn.addEventListener('click', () => {
      // Toggle internal state and update label.
      this._muted = !this._muted;
      this.muteBtn.textContent = this._muted ? 'Unmute' : 'Mute';
      this.dispatchEvent(new CustomEvent('mute-toggle', {
        bubbles: true,
        composed: true,
        detail: { muted: this._muted }
      }));
    });
    container.appendChild(this.muteBtn);

    // Visual mode selector
    this.modeSelect = document.createElement('select');
    const modes = [
      { value: 'radial', label: 'Radial Waves' },
      { value: 'polygon', label: 'Dynamic Polygons' },
      { value: 'layers', label: 'Layered Interference' },
      { value: 'particles', label: 'Particle Flow' }
    ];
    modes.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this.modeSelect.appendChild(opt);
    });
    this.modeSelect.disabled = true;
    this.modeSelect.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('mode-change', {
        bubbles: true,
        composed: true,
        detail: { mode: this.modeSelect.value }
      }));
    });
    container.appendChild(this.modeSelect);

    // Append controls container
    shadow.appendChild(container);

    // Loader message
    this.loaderDiv = document.createElement('div');
    this.loaderDiv.id = 'loader';
    this.loaderDiv.textContent = 'Initializing audio engine...';
    shadow.appendChild(this.loaderDiv);

    // Informational text
    const info = document.createElement('div');
    info.id = 'info';
    info.textContent = 'Each generation creates unique, slowly evolving audiovisual patterns.';
    shadow.appendChild(info);

    // Tone loader element – hidden but functional. When Tone.js finishes
    // loading it dispatches the `tone-ready` event which we listen for
    // below. The element itself does not render anything visible.
    const toneLoader = document.createElement('tone-loader');
    // Propagate a custom URL if the host set one.
    if (this.hasAttribute('tone-url')) {
      toneLoader.setAttribute('tone-url', this.getAttribute('tone-url'));
    }
    shadow.appendChild(toneLoader);

    // Event handlers for tone lifecycle.
    // When Tone is ready we enable the controls and update the loader.
    this.addEventListener('tone-ready', (ev) => {
      // Only respond once.
      if (this._toneReady) return;
      this._toneReady = true;
      this.loaderDiv.textContent = `Tone.js v${ev.detail?.Tone?.version || '?' } ready.`;
      this.startBtn.disabled = false;
      this.modeSelect.disabled = false;
      // Mute button remains disabled until playback starts.
    });
    this.addEventListener('tone-error', (ev) => {
      this.loaderDiv.textContent = 'Failed to load Tone.js. App cannot start.';
      this.loaderDiv.style.color = '#f66';
      this.startBtn.disabled = true;
      this.muteBtn.disabled = true;
      this.modeSelect.disabled = true;
      console.error('[OscControls] Tone.js load error:', ev.detail);
    });
  }

  /**
   * Called by the orchestrator to reflect whether the experience is playing
   * or stopped. Updates button states accordingly.
   * @param {boolean} playing
   */
  setPlaying(playing) {
    this._playing = playing;
    this.startBtn.textContent = playing ? 'Regenerate Experience' : 'Generate New Experience';
    this.muteBtn.disabled = !playing;
    // When stopping, reset mute state and label.
    if (!playing) {
      this._muted = false;
      this.muteBtn.textContent = 'Mute';
    }
  }

  /**
   * Optional getter for the current mode, exposed for convenience.
   */
  get mode() {
    return this.modeSelect.value;
  }
}

customElements.define('osc-controls', OscControls);