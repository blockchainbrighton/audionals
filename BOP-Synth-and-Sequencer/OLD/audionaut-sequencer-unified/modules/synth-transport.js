/**
 * @file SynthTransport.js
 * @description Transport UI component for the BOP Synthesizer.
 */

export class Transport {
    constructor(containerElement, eventBus) {
        this.container = containerElement;
        this.eventBus = eventBus;
        this.buttons = {};
        this._keyListener = null;
        if (!this.container) {
            console.error('[Transport] A valid container element was not provided.');
            return;
        }
        this.init();
    }

    init() {
        console.log('[Transport] Transport controls initializing...');
        this.createButtons();
        this.setupEventListeners();
        this.wireUpButtonEvents();
        console.log('[Transport] Transport controls initialized.');
    }

    createButtons() {
        this.container.innerHTML = `
            <button id="recordBtn" class="transport-button record-btn"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button stop-btn" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button play-btn" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button clear-btn"><span>🗑</span>Clear</button>
            <button id="saveBtn" class="transport-button save-button"><span>💾</span>Save State</button>
            <button id="loadBtn" class="transport-button load-button"><span>📁</span>Load State</button>
            <input type="file" id="loadFileInput" accept=".synthstate,.json" style="display: none;">
            <div id="saveLoadStatus" class="save-load-status" style="display: none;"></div>
        `;
        this.buttons = {
            record: this.container.querySelector('#recordBtn'),
            stop: this.container.querySelector('#stopBtn'),
            play: this.container.querySelector('#playBtn'),
            clear: this.container.querySelector('#clearBtn'),
            save: this.container.querySelector('#saveBtn'),
            load: this.container.querySelector('#loadBtn')
        };
    }

    setupEventListeners() {
        this.eventBus.addEventListener('transport-state-update', (e) => {
            const { isRecording, isArmed, isPlaying, hasSequence } = e.detail;
            this.updateButtonStates(isRecording, isArmed, isPlaying, hasSequence);
        });
    }

    wireUpButtonEvents() {
        const { record, stop, play, clear, save, load } = this.buttons;
        record?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('transport-record')));
        stop?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('transport-stop')));
        play?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('transport-play')));
        clear?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('transport-clear')));
        save?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('save-project')));
        const loadFileInput = this.container.querySelector('#loadFileInput');
        load?.addEventListener('click', () => loadFileInput?.click());
        loadFileInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => this.eventBus.dispatchEvent(new CustomEvent('load-project', { detail: { data: event.target.result } }));
            reader.readAsText(file);
            e.target.value = '';
        });

        this._keyListener = (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.repeat) {
                if (e.key === 's') { e.preventDefault(); this.eventBus.dispatchEvent(new CustomEvent('save-project')); }
                if (e.key === 'o') { e.preventDefault(); loadFileInput?.click(); }
            }
        };
        document.addEventListener('keydown', this._keyListener);
    }

    updateButtonStates(isRecording = false, isArmed = false, isPlaying = false, hasSequence = false) {
        const { record, play, stop, clear } = this.buttons;
        if (!record) return;

        play.disabled = !hasSequence || isRecording || isPlaying;
        clear.disabled = !hasSequence || isRecording;
        stop.disabled = !isPlaying && !isRecording;
        record.disabled = isPlaying;

        record.classList.toggle('armed', isRecording || isArmed);

        this.updateGlobalStatus(isRecording, isArmed, isPlaying, hasSequence);
    }

    updateGlobalStatus(isRecording, isArmed, isPlaying, hasSequence) {
        let statusText = 'Inactive';
        if (isRecording) statusText = 'Recording...';
        else if (isPlaying) statusText = 'Playing...';
        else if (isArmed) statusText = 'Armed';
        else if (hasSequence) statusText = 'Stopped';

        const recStatEl = document.getElementById('recStat');
        const recIndEl = document.getElementById('recInd');
        if (recStatEl) recStatEl.textContent = 'Status: ' + statusText;
        if (recIndEl) recIndEl.classList.toggle('active', isRecording || isPlaying);
    }

    destroy() {
        if (this._keyListener) {
            document.removeEventListener('keydown', this._keyListener);
            this._keyListener = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.buttons = {};
    }

}

export default Transport;
