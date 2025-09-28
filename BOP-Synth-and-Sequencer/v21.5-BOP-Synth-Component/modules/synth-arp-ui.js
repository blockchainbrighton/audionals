/**
 * @file synth-arp-ui.js
 * @description UI controls for the ArpeggiatorEngine. Provides mode toggle,
 * pattern/rate controls, and a live view of captured notes.
 */

export class ArpUI {
    constructor(containerElement, eventBus, state) {
        this.container = containerElement;
        this.eventBus = eventBus;
        this.state = state;
        this.elements = {};
        this._handlers = [];
        this._isApplyingUI = false;
        if (!this.container) {
            console.warn('[ArpUI] No container element provided.');
            return;
        }
        this.init();
    }

    init() {
        this.render();
        this.bindUIEvents();
        this.listenToSystemEvents();
        this.syncFromState();
    }

    render() {
        this.container.innerHTML = `
            <div class="arp-panel">
                <div class="arp-header">
                    <label class="arp-toggle">
                        <input type="checkbox" id="arpModeToggle">
                        <span>Enable Arpeggiator Mode</span>
                    </label>
                    <span class="arp-status" id="arpStatus">Idle</span>
                </div>
                <div class="arp-controls-row">
                    <label>
                        Pattern
                        <select id="arpPattern">
                            <option value="up">Up</option>
                            <option value="down">Down</option>
                            <option value="updown">Up-Down</option>
                            <option value="random">Random</option>
                        </select>
                    </label>
                    <label>
                        Rate
                        <select id="arpRate">
                            <option value="1n">Whole</option>
                            <option value="2n">Half</option>
                            <option value="4n">Quarter</option>
                            <option value="8n" selected>Eighth</option>
                            <option value="16n">Sixteenth</option>
                            <option value="32n">Thirty-Second</option>
                        </select>
                    </label>
                    <label>
                        Gate
                        <input type="range" min="0.1" max="1" step="0.05" id="arpGate">
                    </label>
                    <label>
                        Octaves
                        <select id="arpOctaves">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </label>
                    <label class="arp-toggle">
                        <input type="checkbox" id="arpLatch">
                        <span>Latch</span>
                    </label>
                    <label class="arp-toggle">
                        <input type="checkbox" id="arpLoop">
                        <span>Loop</span>
                    </label>
                    <button id="arpClear" type="button" class="arp-clear">Clear Notes</button>
                </div>
                <div class="arp-notes">
                    <strong>Source Notes:</strong>
                    <span id="arpNotesList">–</span>
                </div>
            </div>
        `;
        const qs = id => this.container.querySelector(id);
        this.elements = {
            modeToggle: qs('#arpModeToggle'),
            status: qs('#arpStatus'),
            pattern: qs('#arpPattern'),
            rate: qs('#arpRate'),
            gate: qs('#arpGate'),
            octaves: qs('#arpOctaves'),
            latch: qs('#arpLatch'),
            loop: qs('#arpLoop'),
            clear: qs('#arpClear'),
            notesList: qs('#arpNotesList')
        };
        if (this.elements.gate) this.elements.gate.value = this.state?.arp?.settings?.gate ?? 0.8;
    }

    bindUIEvents() {
        const on = (el, ev, fn) => {
            if (!el) return;
            el.addEventListener(ev, fn);
            this._handlers.push({ el, ev, fn });
        };

        on(this.elements.modeToggle, 'change', e => {
            if (this._isApplyingUI) return;
            this.eventBus.dispatchEvent(new CustomEvent('arp-mode-toggle', {
                detail: { enabled: e.target.checked }
            }));
        });

        on(this.elements.pattern, 'change', e => this.dispatchSetting({ pattern: e.target.value }));
        on(this.elements.rate, 'change', e => this.dispatchSetting({ rate: e.target.value }));
        on(this.elements.gate, 'input', e => this.dispatchSetting({ gate: parseFloat(e.target.value) }));
        on(this.elements.octaves, 'change', e => this.dispatchSetting({ octaves: parseInt(e.target.value, 10) }));
        on(this.elements.latch, 'change', e => this.dispatchSetting({ latch: e.target.checked }));
        on(this.elements.loop, 'change', e => this.dispatchSetting({ loop: e.target.checked }));
        on(this.elements.clear, 'click', () => {
            this.eventBus.dispatchEvent(new CustomEvent('arp-clear'));
        });
    }

    dispatchSetting(partial) {
        if (!partial) return;
        this.eventBus.dispatchEvent(new CustomEvent('arp-setting-change', {
            detail: partial
        }));
    }

    listenToSystemEvents() {
        this.eventBus.addEventListener('arp-state-changed', e => this.updateArpState(e.detail));
        this.eventBus.addEventListener('arp-sequence-changed', e => this.updateSequenceInfo(e.detail));
        this.eventBus.addEventListener('transport-state-update', e => {
            if (!e.detail) return;
            if (typeof e.detail.activeEngine === 'string') {
                this.updateModeIndicator(e.detail.activeEngine === 'arpeggiator');
            }
            this.updateStatus(e.detail);
        });
    }

    syncFromState() {
        const modeEnabled = this.state?.mode === 'arpeggiator';
        this.updateModeIndicator(modeEnabled);
        this.updateArpState(this.state?.arp || {});
    }

    updateModeIndicator(enabled) {
        this._isApplyingUI = true;
        if (this.elements.modeToggle) this.elements.modeToggle.checked = !!enabled;
        const panel = this.container.querySelector('.arp-panel');
        if (panel) panel.classList.toggle('enabled', !!enabled);
        const disabled = !enabled;
        ['pattern', 'rate', 'gate', 'octaves', 'latch', 'loop', 'clear'].forEach(key => {
            const el = this.elements[key];
            if (el) el.disabled = disabled;
        });
        this._isApplyingUI = false;
    }

    updateArpState(detail = {}) {
        const { settings = {}, sourceNotes = [], isArmed = false, isPlaying = false } = detail;
        if (this.elements.pattern && settings.pattern) this.elements.pattern.value = settings.pattern;
        if (this.elements.rate && settings.rate) this.elements.rate.value = settings.rate;
        if (this.elements.gate && typeof settings.gate === 'number') this.elements.gate.value = settings.gate;
        if (this.elements.octaves && settings.octaves) this.elements.octaves.value = settings.octaves;
        if (this.elements.latch) this.elements.latch.checked = !!settings.latch;
        if (this.elements.loop) this.elements.loop.checked = !!settings.loop;
        this.updateNotesList(sourceNotes);
        this.updateStatus({ isArmed, isPlaying, hasSequence: (detail.sequence?.events || []).length > 0 });
        this.updateArmedIndicator(isArmed, isPlaying);
    }

    updateSequenceInfo(detail = {}) {
        if (!detail.sequence) return;
        const sourceNotes = detail.sequence.meta?.sourceNotes || detail.sequence.meta?.settings?.sourceNotes || [];
        this.updateNotesList(sourceNotes);
        this.updateStatus({ hasSequence: (detail.sequence.events || []).length > 0 });
    }

    updateNotesList(notes = []) {
        if (!this.elements.notesList) return;
        this.elements.notesList.textContent = notes.length ? notes.join(', ') : '–';
        if (this.elements.clear) {
            const enabled = this.elements.modeToggle ? this.elements.modeToggle.checked : true;
            this.elements.clear.disabled = !enabled || notes.length === 0;
        }
    }

    updateArmedIndicator(isArmed, isPlaying) {
        if (!this.elements.status) return;
        const statusText = isPlaying ? 'Playing' : isArmed ? 'Capturing' : 'Idle';
        this.elements.status.textContent = statusText;
        this.elements.status.classList.toggle('armed', !!isArmed);
        this.elements.status.classList.toggle('playing', !!isPlaying);
    }

    updateStatus(detail = {}) {
        if (!this.elements.status) return;
        const status = this.elements.status;
        if (detail.isPlaying) {
            status.textContent = 'Playing';
        } else if (detail.isArmed) {
            status.textContent = 'Capturing';
        } else if (detail.hasSequence) {
            status.textContent = 'Ready';
        } else {
            status.textContent = 'Idle';
        }
    }

    destroy() {
        this._handlers.forEach(({ el, ev, fn }) => el.removeEventListener(ev, fn));
        this._handlers = [];
        if (this.container) this.container.innerHTML = '';
    }
}

export default ArpUI;
