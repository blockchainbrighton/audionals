/**
 * Shared MIDI Manager for Web3 Synths
 * Handles device connection, dropdown UI, and message parsing.
 */
export class MidiManager {
    constructor(options = {}) {
        this.onNoteOn = options.onNoteOn || null;
        this.onNoteOff = options.onNoteOff || null;
        this.onCC = options.onCC || null;
        this.deviceSelectorId = options.deviceSelectorId || 'midi-in';
        this.statusElementId = options.statusElementId || 'midi-led';
        
        this.access = null;
        this.activeInput = null;
    }

    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn("WebMIDI not supported in this browser.");
            return false;
        }

        try {
            this.access = await navigator.requestMIDIAccess();
            this.populateDropdown();
            
            // Auto-select first input
            if (this.access.inputs.size > 0) {
                const firstInput = this.access.inputs.values().next().value;
                this.selectDevice(firstInput.id);
            }

            // Watch for connection changes
            this.access.onstatechange = () => this.populateDropdown();
            return true;

        } catch (err) {
            console.error("MIDI Access Failed:", err);
            return false;
        }
    }

    populateDropdown() {
        const sel = document.getElementById(this.deviceSelectorId);
        if (!sel) return;

        // Keep current selection if valid
        const currentId = sel.value;
        sel.innerHTML = '<option value="">Select MIDI Device</option>';

        this.access.inputs.forEach(input => {
            const opt = document.createElement('option');
            opt.value = input.id;
            opt.text = input.name;
            sel.appendChild(opt);
        });

        // Restore selection or reset
        if (Array.from(sel.options).some(o => o.value === currentId)) {
            sel.value = currentId;
        }

        // Bind change event
        sel.onchange = (e) => this.selectDevice(e.target.value);
    }

    selectDevice(id) {
        // Cleanup old listener
        if (this.activeInput) {
            this.activeInput.onmidimessage = null;
        }

        const input = this.access.inputs.get(id);
        if (input) {
            this.activeInput = input;
            input.onmidimessage = (msg) => this.handleMessage(msg);
            
            // Update UI to show connection
            const sel = document.getElementById(this.deviceSelectorId);
            if (sel && sel.value !== id) sel.value = id;
        }
    }

    handleMessage(message) {
        const [status, data1, data2] = message.data;
        const command = status >> 4;
        const channel = status & 0xf;
        
        // Visual Feedback
        this.flashLed();

        // Note On (9)
        if (command === 9 && data2 > 0) {
            if (this.onNoteOn) this.onNoteOn(data1, data2 / 127, channel);
        }
        // Note Off (8) or Note On with 0 velocity
        else if (command === 8 || (command === 9 && data2 === 0)) {
            if (this.onNoteOff) this.onNoteOff(data1, channel);
        }
        // CC (11)
        else if (command === 11) {
            if (this.onCC) this.onCC(data1, data2 / 127, channel);
        }
    }

    flashLed() {
        const led = document.getElementById(this.statusElementId);
        if (led) {
            led.classList.add('active', 'on'); // Support multiple class conventions
            setTimeout(() => led.classList.remove('active', 'on'), 100);
        }
    }
}
