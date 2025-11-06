import { BopSynthLogic } from './modules/synth-logic.js';
import { BopSynthUI } from './modules/synth-ui.js';

const DEFAULT_TONE_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

export class BopSynthComponent {
    constructor(options = {}) {
        const {
            container,
            toneInstance,
            toneUrl = DEFAULT_TONE_URL,
            autoStart = false,
            injectStyles = true
        } = options;
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) throw new Error('BopSynthComponent requires a valid container element.');
        this.providedTone = toneInstance || window.Tone || null;
        this.toneUrl = toneUrl;
        this.autoStart = autoStart;
        this.injectStyles = injectStyles;
        this.logicController = null;
        this.uiController = null;
        this._tabHandlers = [];
        this._resizeHandler = null;
        this._shortcutHandler = null;
        this._overlay = null;
        this._mounted = false;
        this.root = null;
        this._initialized = false;
    }

    async mount() {
        if (this._mounted) return;
        this.renderShell();
        if (this.injectStyles) this.ensureStylesheet();
        await this.loadTone();
        if (this.autoStart) {
            try {
                await this.beginAudio();
            } catch (err) {
                console.warn('[BopSynthComponent] Auto-start failed, falling back to user prompt.', err);
                this.showAudioPrompt();
            }
        } else {
            this.showAudioPrompt();
        }
        this._mounted = true;
    }

    renderShell() {
        this.container.innerHTML = '';
        this.container.classList.add('bop-synth-host');
        this.root = document.createElement('div');
        this.root.className = 'bop-synth';
        this.root.innerHTML = `
            <div class="container">
                <h1>Blockchain-Orchestrated Polyphonic Synthesiser (BOP)</h1>
                <p class="subtitle">Foundational Tooling for The Bitcoin Audional Matrix</p>
                <div class="tabs">
                    <button class="tab-button active" data-tab="synth">Synthesizer</button>
                    <button class="tab-button" data-tab="midi">MIDI Editor</button>
                </div>
                <div id="synth" class="tab-content active">
                    <div id="control-panel"></div>
                    <div class="transport-controls" id="transport-controls"></div>
                    <div class="loop-controls" id="loop-controls"></div>
                    <div class="keyboard-container">
                        <div class="octave-controls">
                            <button id="octaveDown" class="octave-button">Octave -</button>
                            <span id="octaveLabel">Octave: 4</span>
                            <button id="octaveUp" class="octave-button">Octave +</button>
                        </div>
                        <div class="keyboard" id="keyboard"></div>
                    </div>
                    <div class="status-bar">
                        <div><span class="status-indicator" id="midiInd"></span> <span id="midiStat">MIDI: Not supported</span></div>
                        <div><span class="status-indicator" id="recInd"></span> <span id="recStat">Status: Inactive</span></div>
                    </div>
                </div>
                <div id="midi" class="tab-content">
                    <h3>Piano Roll Editor</h3>
                    <div class="piano-roll"><div class="roll-grid" id="rollGrid"></div></div>
                </div>
                <footer>Blockchain-Orchestrated Polyphonic Synth</footer>
            </div>
        `;
        this.container.appendChild(this.root);
    }

    ensureStylesheet() {
        if (document.querySelector('link[data-bop-synth-style]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('./synth-component.css', import.meta.url).href;
        link.dataset.bopSynthStyle = 'true';
        document.head.appendChild(link);
    }

    async loadTone() {
        if (this.providedTone) {
            this.Tone = this.providedTone;
            return;
        }
        if (!window.Tone) {
            try {
                await import(this.toneUrl);
            } catch (err) {
                throw new Error(`Failed to load Tone.js from ${this.toneUrl}: ${err.message}`);
            }
        }
        this.Tone = window.Tone;
        if (!this.Tone) throw new Error('Tone.js did not load correctly.');
    }

    showAudioPrompt() {
        const overlay = document.createElement('div');
        overlay.className = 'bop-start-overlay';
        overlay.innerHTML = '<button type="button">Click to Start Audio</button>';
        this.root.appendChild(overlay);
        const button = overlay.querySelector('button');
        button.addEventListener('click', async () => {
            try {
                await this.beginAudio();
                if (overlay.isConnected) overlay.remove();
            } catch (err) {
                console.error('[BopSynthComponent] Unable to start audio context', err);
                alert('Audio could not start. Please try again.');
            }
        });
        this._overlay = overlay;
    }

    async beginAudio() {
        if (!this.Tone) await this.loadTone();
        if (!this._initialized) {
            await this.Tone.start();
            if (this._overlay) {
                this._overlay.remove();
                this._overlay = null;
            }
            this.initializeSynth();
        }
    }

    initializeSynth() {
        this.logicController = new BopSynthLogic(this.Tone);
        const uiElements = {
            keyboard: this.root.querySelector('.keyboard-container'),
            pianoRoll: this.root.querySelector('#rollGrid'),
            transport: this.root.querySelector('#transport-controls'),
            controls: this.root.querySelector('#control-panel'),
            loopControls: this.root.querySelector('#loop-controls')
        };
        this.uiController = new BopSynthUI(this.logicController, uiElements);
        this.logicController.connectUI?.(this.uiController);
        window.bopSynthLogic = this.logicController;
        window.bopSynthUI = this.uiController;
        this.logicController.eventBus.dispatchEvent(new CustomEvent('tone-ready', {
            detail: { Tone: this.Tone }
        }));
        this.setupGlobalHandlers();
        this._initialized = true;
    }

    setupGlobalHandlers() {
        const eventBus = this.logicController.eventBus;
        const tabButtons = Array.from(this.root.querySelectorAll('.tab-button'));
        const tabContents = Array.from(this.root.querySelectorAll('.tab-content'));
        tabButtons.forEach(btn => {
            const handler = () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                tabContents.forEach(c => c.classList.remove('active'));
                const tabId = btn.dataset.tab;
                const tabContent = this.root.querySelector(`#${tabId}`);
                if (tabContent) tabContent.classList.add('active');
                eventBus.dispatchEvent(new CustomEvent('tab-changed', { detail: { tabId } }));
                if (tabId === 'midi') {
                    eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
                }
            };
            btn.addEventListener('click', handler);
            this._tabHandlers.push({ btn, handler });
        });

        this._resizeHandler = () => {
            eventBus.dispatchEvent(new CustomEvent('window-resize'));
            eventBus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        };
        window.addEventListener('resize', this._resizeHandler);

        this._shortcutHandler = (e) => {
            if (e.ctrlKey || e.metaKey) {
                const map = { '1': 'reverb', '2': 'delay', '3': 'chorus', '4': 'distortion', '5': 'filter' };
                const effect = map[e.key];
                if (effect) {
                    e.preventDefault();
                    eventBus.dispatchEvent(new CustomEvent('shortcut-toggle-effect', {
                        detail: { effectName: effect }
                    }));
                }
            }
        };
        document.addEventListener('keydown', this._shortcutHandler);
    }

    async destroy() {
        this._tabHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
        this._tabHandlers = [];
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._shortcutHandler) {
            document.removeEventListener('keydown', this._shortcutHandler);
            this._shortcutHandler = null;
        }
        if (this.uiController?.destroy) this.uiController.destroy();
        if (this.logicController?.destroy) this.logicController.destroy();
        this.uiController = null;
        this.logicController = null;
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        if (this.root && this.root.isConnected) {
            this.root.remove();
            this.root = null;
        }
        this.container.classList.remove('bop-synth-host');
        this._mounted = false;
        this._initialized = false;
    }
}

export function createBopSynthComponent(options) {
    const component = new BopSynthComponent(options);
    component.mount();
    return component;
}
