import { injectMidiStyles } from './ui_styles.js';

export class MidiManager {
    constructor(options = {}) {
        this.onNoteOn = options.onNoteOn || null;
        this.onNoteOff = options.onNoteOff || null;
        this.onCC = options.onCC || null;
        this.deviceSelectorId = options.deviceSelectorId || 'midi-in';
        this.statusElementId = options.statusElementId || 'midi-led';
        
        this.channel = options.channel || 0; // 0 = Omni, 1-16
        this.lastCC = null; // { controller, value, channel }

        this.access = null;
        this.activeInput = null;
        this._watchdogId = null;
        this._lastMessageAt = 0;
        this._preferredStorageKey = options.preferredStorageKey || 'bvst.midi.preferred/v1';

        this.injectStyles();
        this.init();
    }

    injectStyles() {
        injectMidiStyles();
    }

    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn("WebMIDI not supported in this browser.");
            this.updateDropdownError();
            return false;
        }

        try {
            this.access = await navigator.requestMIDIAccess({ sysex: false });
            this.access.onstatechange = (e) => this._handleStateChange(e);
            this.populateDropdown({ preferSaved: true });
            
            // Auto-select first input if none selected
            if (this.access.inputs.size > 0 && !this.activeInput) {
                this._selectBestAvailable();
            }

            // Watchdog: keep the active port open and switch away from disconnected inputs.
            this._startWatchdog();
            return true;

        } catch (err) {
            console.error("MIDI Access Failed:", err);
            this.updateDropdownError();
            return false;
        }
    }

    _readPreferred() {
        try {
            const raw = localStorage.getItem(this._preferredStorageKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const id = typeof parsed.id === 'string' ? parsed.id : '';
            const name = typeof parsed.name === 'string' ? parsed.name : '';
            const manufacturer = typeof parsed.manufacturer === 'string' ? parsed.manufacturer : '';
            const key = typeof parsed.key === 'string' ? parsed.key : '';
            return { id, name, manufacturer, key };
        } catch (_) {
            return null;
        }
    }

    _writePreferred(input) {
        try {
            if (!input) return;
            const name = input.name || '';
            const manufacturer = input.manufacturer || '';
            const key = `${manufacturer}::${name}`.toLowerCase();
            localStorage.setItem(this._preferredStorageKey, JSON.stringify({
                id: input.id || '',
                name,
                manufacturer,
                key
            }));
        } catch (_) {}
    }

    _listConnectedInputs() {
        if (!this.access) return [];
        const inputs = [];
        this.access.inputs.forEach((input) => {
            if (!input) return;
            if (input.state && input.state !== 'connected') return;
            inputs.push(input);
        });
        inputs.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        return inputs;
    }

    _selectBestAvailable() {
        const connected = this._listConnectedInputs();
        if (connected.length === 0) return;

        const preferred = this._readPreferred();
        if (preferred) {
            const byId = preferred.id ? connected.find((i) => i.id === preferred.id) : null;
            if (byId) return void this.selectDevice(byId.id);
            const byKey = preferred.key
                ? connected.find((i) => (`${i.manufacturer || ''}::${i.name || ''}`.toLowerCase() === preferred.key))
                : null;
            if (byKey) return void this.selectDevice(byKey.id);
        }

        return void this.selectDevice(connected[0].id);
    }

    _handleStateChange(_e) {
        // Rebuild list and ensure our active port is still valid.
        this.populateDropdown({ preferSaved: true });

        if (this.activeInput) {
            if (this.activeInput.state && this.activeInput.state !== 'connected') {
                this.activeInput.onmidimessage = null;
                this.activeInput = null;
            } else if (this.activeInput.connection === 'closed' && typeof this.activeInput.open === 'function') {
                this.activeInput.open().catch(() => {});
            }
        }

        if (!this.activeInput) this._selectBestAvailable();
    }

    _startWatchdog() {
        if (this._watchdogId) return;
        this._watchdogId = window.setInterval(() => {
            if (!this.access) return;
            if (this.activeInput) {
                if (this.activeInput.state && this.activeInput.state !== 'connected') {
                    this.activeInput.onmidimessage = null;
                    this.activeInput = null;
                    this._selectBestAvailable();
                    return;
                }
                if (this.activeInput.connection === 'closed' && typeof this.activeInput.open === 'function') {
                    this.activeInput.open().catch(() => {});
                }
            } else {
                this._selectBestAvailable();
            }
        }, 2000);
    }

    updateDropdownError() {
        const sel = document.getElementById(this.deviceSelectorId);
        if (sel) {
            sel.innerHTML = '<option>MIDI Not Available</option>';
            sel.disabled = true;
        }
    }

    populateDropdown({ preferSaved = false } = {}) {
        const sel = document.getElementById(this.deviceSelectorId);
        if (!sel) return;

        // Keep current selection if valid
        const currentId = sel.value;
        sel.innerHTML = '<option value="">Select MIDI Device...</option>';

        const connected = this._listConnectedInputs();
        if (connected.length > 0) {
            connected.forEach((input) => {
                const opt = document.createElement('option');
                opt.value = input.id;
                opt.text = input.name;
                sel.appendChild(opt);
            });
        } else {
             const opt = document.createElement('option');
             opt.text = "No Devices Found";
             sel.appendChild(opt);
        }

        // Restore selection if it still exists, otherwise fall back to preferred device.
        const hasCurrent = currentId && Array.from(sel.options).some((o) => o.value === currentId);
        if (hasCurrent) {
            sel.value = currentId;
            // Ensure the handler is bound to the selected input.
            if (!this.activeInput || this.activeInput.id !== currentId) this.selectDevice(currentId);
        } else if (preferSaved) {
            this._selectBestAvailable();
        } else if (connected.length > 0) {
            this.selectDevice(connected[0].id);
        }

        // Bind change event
        sel.onchange = (e) => this.selectDevice(e.target.value);
    }

    selectDevice(id) {
        if (!id) return;

        // Cleanup old listener
        if (this.activeInput) {
            this.activeInput.onmidimessage = null;
        }

        const input = this.access && this.access.inputs ? this.access.inputs.get(id) : null;
        if (input) {
            // If the browser requires explicit open() to resume receiving data, do it.
            if (input.connection === 'closed' && typeof input.open === 'function') {
                input.open().catch(() => {});
            }

            this.activeInput = input;
            input.onmidimessage = (msg) => this.handleMessage(msg);
            this._writePreferred(input);
            
            // Update UI
            const sel = document.getElementById(this.deviceSelectorId);
            if (sel && sel.value !== id) sel.value = id;
            console.log(`MIDI: Connected to ${input.name}`);
        }
    }

    handleMessage(message) {
        this._lastMessageAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const [status, data1, data2] = message.data;
        
        // Ignore System Realtime (Clock, Active Sensing, etc.)
        if (status >= 240) return;

        const command = status >> 4;
        const channel = (status & 0xf) + 1; // 1-16
        
        // Channel Filter (0 = Omni)
        if (this.channel > 0 && channel !== this.channel) return;
        
        // Note On (9)
        if (command === 9 && data2 > 0) {
            this.flashLed();
            if (this.onNoteOn) this.onNoteOn(data1, data2 / 127, channel);
        }
        // Note Off (8) or Note On with 0 velocity
        else if (command === 8 || (command === 9 && data2 === 0)) {
            if (this.onNoteOff) this.onNoteOff(data1, channel);
        }
        // CC (11)
        else if (command === 11) {
            this.lastCC = { controller: data1, value: data2, channel: channel };
            this.flashLed();
            if (this.onCC) this.onCC(data1, data2 / 127, channel);
        }
    }

    flashLed() {
        const led = document.getElementById(this.statusElementId);
        if (led) {
            led.classList.add('active');
            setTimeout(() => led.classList.remove('active'), 100);
        }
    }
}
