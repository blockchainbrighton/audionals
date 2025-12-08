export class MidiManager {
    constructor(options = {}) {
        this.onNoteOn = options.onNoteOn || null;
        this.onNoteOff = options.onNoteOff || null;
        this.onCC = options.onCC || null;
        this.deviceSelectorId = options.deviceSelectorId || 'midi-in';
        this.statusElementId = options.statusElementId || 'midi-led';
        
        this.access = null;
        this.activeInput = null;

        this.injectStyles();
        this.init();
    }

    injectStyles() {
        const styleId = 'bvst-midi-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* MIDI Styles injected by MidiManager */
            .midi-container {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
                padding: 8px;
                background: #1a1a1a;
                border-radius: 6px;
                border: 1px solid #333;
                width: fit-content;
            }
            
            .midi-label {
                font-size: 11px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: bold;
            }
            
            #${this.deviceSelectorId} {
                background: #111;
                color: #ccc;
                border: 1px solid #444;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                width: 180px;
                outline: none;
                cursor: pointer;
            }
            #${this.deviceSelectorId}:hover {
                border-color: #666;
            }

            #${this.statusElementId} {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #330000;
                border: 1px solid #550000;
                transition: background 0.05s, box-shadow 0.05s;
                flex-shrink: 0;
            }
            
            #${this.statusElementId}.active {
                background: #ff3333;
                box-shadow: 0 0 8px #ff0000;
                border-color: #ff8888;
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn("WebMIDI not supported in this browser.");
            this.updateDropdownError();
            return false;
        }

        try {
            this.access = await navigator.requestMIDIAccess();
            this.populateDropdown();
            
            // Auto-select first input if none selected
            if (this.access.inputs.size > 0 && !this.activeInput) {
                const firstInput = this.access.inputs.values().next().value;
                this.selectDevice(firstInput.id);
            }

            // Watch for connection changes
            this.access.onstatechange = () => this.populateDropdown();
            return true;

        } catch (err) {
            console.error("MIDI Access Failed:", err);
            this.updateDropdownError();
            return false;
        }
    }

    updateDropdownError() {
        const sel = document.getElementById(this.deviceSelectorId);
        if (sel) {
            sel.innerHTML = '<option>MIDI Not Available</option>';
            sel.disabled = true;
        }
    }

    populateDropdown() {
        const sel = document.getElementById(this.deviceSelectorId);
        if (!sel) return;

        // Keep current selection if valid
        const currentId = sel.value;
        sel.innerHTML = '<option value="">Select MIDI Device...</option>';

        if (this.access && this.access.inputs.size > 0) {
            this.access.inputs.forEach(input => {
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

        // Restore selection if it still exists
        if (currentId && Array.from(sel.options).some(o => o.value === currentId)) {
            sel.value = currentId;
        } else if (this.access && this.access.inputs.size > 0) {
             // If lost selection, re-select first
             const first = this.access.inputs.values().next().value;
             this.selectDevice(first.id);
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

        const input = this.access.inputs.get(id);
        if (input) {
            this.activeInput = input;
            input.onmidimessage = (msg) => this.handleMessage(msg);
            
            // Update UI
            const sel = document.getElementById(this.deviceSelectorId);
            if (sel && sel.value !== id) sel.value = id;
            console.log(`MIDI: Connected to ${input.name}`);
        }
    }

    handleMessage(message) {
        const [status, data1, data2] = message.data;
        const command = status >> 4;
        const channel = status & 0xf;
        
        // Note On (9)
        if (command === 9 && data2 > 0) {
            this.flashLed();
            if (this.onNoteOn) this.onNoteOn(data1, data2 / 127, channel);
        }
        // Note Off (8) or Note On with 0 velocity
        else if (command === 8 || (command === 9 && data2 === 0)) {
            // Don't necessarily flash LED on note off, or maybe briefly?
            if (this.onNoteOff) this.onNoteOff(data1, channel);
        }
        // CC (11)
        else if (command === 11) {
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
