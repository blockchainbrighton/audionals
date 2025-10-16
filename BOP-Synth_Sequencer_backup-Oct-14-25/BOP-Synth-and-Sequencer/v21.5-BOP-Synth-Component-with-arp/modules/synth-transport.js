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
        this.activeEngine = 'recorder';
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
        this.eventBus.dispatchEvent(new CustomEvent('transport-config-request'));
        console.log('[Transport] Transport controls initialized.');
    }

    createButtons() {
        this.container.innerHTML = `
            <button id="recordBtn" class="transport-button record-btn"><span class="icon">●</span><span class="label">Record</span></button>
            <button id="stopBtn" class="transport-button stop-btn" disabled><span class="icon">■</span><span class="label">Stop</span></button>
            <button id="playBtn" class="transport-button play-btn" disabled><span class="icon">▶</span><span class="label">Play</span></button>
            <button id="clearBtn" class="transport-button clear-btn"><span class="icon">🗑</span><span class="label">Clear</span></button>
            <button id="saveBtn" class="transport-button save-button"><span class="icon">💾</span><span class="label">Save State</span></button>
            <button id="loadBtn" class="transport-button load-button"><span class="icon">📁</span><span class="label">Load State</span></button>
            <div class="transport-tempo" id="transportTempoControls">
                <label class="tempo-source">
                    <span>Clock</span>
                    <select id="clockSource">
                        <option value="internal">Internal</option>
                        <option value="host">Host</option>
                    </select>
                </label>
                <label class="tempo-value">
                    <span>BPM</span>
                    <input type="number" id="tempoInput" min="20" max="300" step="0.1" value="120">
                </label>
                <span id="tempoStatus" class="tempo-status">Internal • 120 BPM</span>
            </div>
            <input type="file" id="loadFileInput" accept=".synthstate,.json" style="display: none;">
            <div id="saveLoadStatus" class="save-load-status" style="display: none;"></div>
        `;
        this.buttons = {
            record: this.container.querySelector('#recordBtn'),
            stop: this.container.querySelector('#stopBtn'),
            play: this.container.querySelector('#playBtn'),
            clear: this.container.querySelector('#clearBtn'),
            save: this.container.querySelector('#saveBtn'),
            load: this.container.querySelector('#loadBtn'),
            clockSource: this.container.querySelector('#clockSource'),
            tempoInput: this.container.querySelector('#tempoInput'),
            tempoStatus: this.container.querySelector('#tempoStatus')
        };
    }

    setupEventListeners() {
        this.activeEngine = 'recorder';
        this.eventBus.addEventListener('transport-state-update', (e) => {
            const { isRecording, isArmed, isPlaying, hasSequence, activeEngine } = e.detail;
            if (activeEngine) this.activeEngine = activeEngine;
            this.updateButtonStates(isRecording, isArmed, isPlaying, hasSequence);
        });
        this.eventBus.addEventListener('transport-config-update', e => this.updateTempoControls(e.detail));
    }

    wireUpButtonEvents() {
        const { record, stop, play, clear, save, load, clockSource, tempoInput } = this.buttons;
        record?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('transport-record')));
        stop?.addEventListener('click', () => this.eventBus.dispatchEvent(new CustomEvent('transport-stop')));
        play?.addEventListener('click', () => {
            const source = clockSource?.value || 'internal';
            const payload = { clockSource: source };
            if (source !== 'host') {
                const bpm = tempoInput ? parseFloat(tempoInput.value) : NaN;
                if (Number.isFinite(bpm)) payload.bpm = bpm;
            }
            this.eventBus.dispatchEvent(new CustomEvent('transport-play', { detail: payload }));
        });
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

        clockSource?.addEventListener('change', e => {
            const source = e.target.value;
            this.eventBus.dispatchEvent(new CustomEvent('clock-source-change', {
                detail: { source }
            }));
        });
        tempoInput?.addEventListener('change', e => {
            const bpm = parseFloat(e.target.value);
            if (!Number.isFinite(bpm)) return;
            this.eventBus.dispatchEvent(new CustomEvent('tempo-change', {
                detail: { bpm }
            }));
        });
    }

    updateButtonStates(isRecording = false, isArmed = false, isPlaying = false, hasSequence = false) {
        const { record, play, stop, clear } = this.buttons;
        if (!record) return;

        play.disabled = !hasSequence || isRecording || isPlaying;
        clear.disabled = !hasSequence || isRecording;
        stop.disabled = !isPlaying && !isRecording;
        record.disabled = isPlaying;

        const labelEl = record.querySelector('.label');
        const iconEl = record.querySelector('.icon');
        if (labelEl) labelEl.textContent = this.activeEngine === 'arpeggiator' ? 'Capture' : 'Record';
        if (iconEl) iconEl.textContent = this.activeEngine === 'arpeggiator' ? '✱' : '●';

        record.classList.toggle('armed', isRecording || isArmed);

        this.updateGlobalStatus(isRecording, isArmed, isPlaying, hasSequence);
    }

    updateGlobalStatus(isRecording, isArmed, isPlaying, hasSequence) {
        let statusText = 'Inactive';
        if (isRecording) statusText = 'Recording...';
        else if (isPlaying) statusText = 'Playing...';
        else if (isArmed) statusText = 'Armed';
        else if (hasSequence) statusText = 'Stopped';

        if (this.activeEngine === 'arpeggiator') {
            statusText = `Arp ${statusText}`;
        }

        const recStatEl = document.getElementById('recStat');
        const recIndEl = document.getElementById('recInd');
        if (recStatEl) recStatEl.textContent = 'Status: ' + statusText;
        if (recIndEl) recIndEl.classList.toggle('active', isRecording || isPlaying);
    }

    updateTempoControls(detail = {}) {
        const { clockSource = 'internal', bpm, hostBpm, effectiveBpm } = detail;
        const select = this.buttons.clockSource;
        const input = this.buttons.tempoInput;
        const statusEl = this.buttons.tempoStatus;
        if (select) select.value = clockSource;
        const displayBpm = Number.isFinite(effectiveBpm) ? effectiveBpm : (Number.isFinite(bpm) ? bpm : 120);
        if (input) {
            const formatted = this.formatBpm(displayBpm);
            input.value = formatted;
            input.disabled = clockSource === 'host';
        }
        if (statusEl) {
            if (clockSource === 'host') {
                if (Number.isFinite(hostBpm)) {
                    statusEl.textContent = `Host • ${this.formatBpm(hostBpm)} BPM`;
                } else {
                    statusEl.textContent = 'Host • awaiting BPM';
                }
            } else {
                statusEl.textContent = `Internal • ${this.formatBpm(displayBpm)} BPM`;
            }
        }
    }

    formatBpm(value) {
        if (!Number.isFinite(value)) return '120';
        return (Math.abs(value % 1) < 0.01) ? value.toFixed(0) : value.toFixed(1);
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
