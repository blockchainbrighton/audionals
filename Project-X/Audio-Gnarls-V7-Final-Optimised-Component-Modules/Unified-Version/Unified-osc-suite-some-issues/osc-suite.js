// Top level orchestrator for the Oscilloscope Suite.  This custom
// element manages a sidebar of buttons to switch between the four
// available modes (A–D).  Each mode registers its own custom
// elements via its bundle module.  The orchestrator preloads one
// instance of each mode and toggles their visibility on demand.  When
// switching modes the previous mode is hidden and audio output is
// muted to prevent overlap.  Tone.js is loaded once via <tone-loader>.

class OscSuite extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Internal map of mode identifiers to component tag names.  The
    // tag names correspond to the definitions in the mode bundles.
    this._modes = {
      A: 'mode-a-app',
      B: 'mode-b-app',
      C: 'mode-c-app',
      D: 'mode-d-app'
    };
    // Currently visible mode key.
    this._activeMode = 'A';
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    // Basic layout: a sidebar with buttons and a main area for modes.
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    const content = document.createElement('div');
    content.id = 'content';
    wrapper.append(sidebar, content);
    // Insert a Tone loader to trigger a single import.  It will
    // dispatch a 'tone-ready' event when Tone.js is available.
    const toneLoader = document.createElement('tone-loader');
    // Build buttons for each mode
    Object.keys(this._modes).forEach(key => {
      const btn = document.createElement('button');
      btn.textContent = `Mode ${key}`;
      btn.dataset.mode = key;
      btn.addEventListener('click', () => this._switchMode(key));
      sidebar.appendChild(btn);
    });
    // Pre-instantiate each mode's root element and append to the
    // content area.  All but the active mode are hidden via inline
    // style.  Because the custom elements are registered ahead of
    // time by the mode bundles, creation here will trigger their
    // connectedCallback logic and preload any internal resources.
    this._instances = {};
    for (const [key, tag] of Object.entries(this._modes)) {
      const el = document.createElement(tag);
      // Hide inactive modes
      if (key !== this._activeMode) {
        el.style.display = 'none';
      }
      content.appendChild(el);
      this._instances[key] = el;
    }
    // Append everything to the shadow root along with scoped styles.
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        height: 100%;
      }
      #wrapper {
        display: flex;
        height: 100%;
      }
      #sidebar {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
        background: #111;
        border-right: 1px solid #333;
      }
      #sidebar button {
        padding: 0.4rem 0.8rem;
        background: #222;
        color: #eee;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
      }
      #sidebar button:hover {
        background: #333;
      }
      #content {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
    shadow.append(style, toneLoader, wrapper);
  }

  /**
   * Switch from the currently active mode to a new mode.  Hides the
   * previous element and reveals the requested one.  Mutes global
   * audio output via Tone.js to prevent audible overlap.  If Tone
   * isn't yet loaded this simply toggles visibility.
   * @param {string} key
   */
  _switchMode(key) {
    if (this._activeMode === key) return;
    // Hide current
    const current = this._instances[this._activeMode];
    if (current) {
      current.style.display = 'none';
    }
    // Show new
    const next = this._instances[key];
    if (next) {
      next.style.display = '';
    }
    this._activeMode = key;
    // Mute global audio to avoid overlap.  When the new mode starts
    // playing it should unmute itself as appropriate.
    if (window.Tone) {
      try {
        window.Tone.Destination.mute = true;
      } catch (e) {}
    }
  }
}

customElements.define('osc-suite', OscSuite);