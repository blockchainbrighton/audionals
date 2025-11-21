import { BopSynthUI } from './synth-ui.js';

const template = document.createElement('template');
template.innerHTML = `
    <div class="container">
        <h1>Blockchain-Orchestrated Polyphonic Synthesiser (BOP)</h1>
        <p class="subtitle">Foundational Tooling for The Bitcoin Audional Matrix</p>
        <div class="tabs">
            <button class="tab-button active" data-tab="synth">Synthesizer</button>
            <button class="tab-button" data-tab="midi">MIDI Editor</button>
        </div>
        <div id="synth" class="tab-content active">
            <div id="control-panel" class="control-panel"></div>
            <div id="transport-controls" class="transport-controls"></div>
            <div id="arp-controls" class="arp-controls"></div>
            <div id="loop-controls" class="loop-controls"></div>
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
            <div id="status" class="status">Status: Ready</div>
            <div id="saveLoadStatus" class="save-load-status" style="display:none;"></div>
        </div>
        <div id="midi" class="tab-content">
            <h3>Piano Roll Editor</h3>
            <div class="piano-roll"><div class="roll-grid" id="rollGrid"></div></div>
        </div>
        <footer>Blockchain-Orchestrated Polyphonic Synth</footer>
    </div>
`;

function cloneTemplate() {
    return template.content.cloneNode(true);
}

export class BopSynthArpUIComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = new URL('../synth-component.css', import.meta.url).href;
        this.shadowRoot.append(stylesheet, cloneTemplate());

        this.logic = null;
        this.uiController = null;
        this._tabHandlers = [];
        this._resizeHandler = null;
        this._shortcutHandler = null;
    }

    connect(logicController) {
        if (!logicController) {
            throw new Error('A valid logicController is required.');
        }

        if (this.logic && this.logic !== logicController) {
            this._teardown();
        }

        this.logic = logicController;
        this.uiController = new BopSynthUI(logicController, {
            keyboard: this.shadowRoot.querySelector('.keyboard-container'),
            transport: this.shadowRoot.getElementById('transport-controls'),
            controls: this.shadowRoot.getElementById('control-panel'),
            pianoRoll: this.shadowRoot.getElementById('rollGrid'),
            loopControls: this.shadowRoot.getElementById('loop-controls'),
            arpControls: this.shadowRoot.getElementById('arp-controls')
        });
        logicController.connectUI?.(this.uiController);
        logicController.eventBus?.dispatchEvent(new CustomEvent('tone-ready', {
            detail: { Tone: logicController.Tone }
        }));
        this._setupHandlers();
    }

    disconnectedCallback() {
        this._teardown();
        if (this.logic?.disconnectUI) {
            this.logic.disconnectUI();
        }
        this.logic = null;
    }

    _setupHandlers() {
        this._teardownHandlers();
        const shadow = this.shadowRoot;
        const tabButtons = Array.from(shadow.querySelectorAll('.tab-button'));
        const tabContents = Array.from(shadow.querySelectorAll('.tab-content'));
        const eventBus = this.logic?.eventBus;

        tabButtons.forEach(btn => {
            const handler = () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                tabContents.forEach(content => content.classList.remove('active'));
                const tabId = btn.dataset.tab;
                const activeContent = shadow.getElementById(tabId);
                if (activeContent) activeContent.classList.add('active');
                eventBus?.dispatchEvent(new CustomEvent('tab-changed', { detail: { tabId } }));
                if (tabId === 'midi') {
                    eventBus?.dispatchEvent(new CustomEvent('pianoroll-redraw'));
                }
            };
            btn.addEventListener('click', handler);
            this._tabHandlers.push({ btn, handler });
        });

        this._resizeHandler = () => {
            eventBus?.dispatchEvent(new CustomEvent('window-resize'));
            eventBus?.dispatchEvent(new CustomEvent('keyboard-redraw'));
        };
        window.addEventListener('resize', this._resizeHandler);

        this._shortcutHandler = e => {
            if (!eventBus) return;
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

    _teardownHandlers() {
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
    }

    _teardown() {
        this._teardownHandlers();
        if (this.uiController?.destroy) {
            this.uiController.destroy();
        }
        this.uiController = null;
    }
}

if (!customElements.get('bop-synth-arp-ui')) {
    customElements.define('bop-synth-arp-ui', BopSynthArpUIComponent);
}

