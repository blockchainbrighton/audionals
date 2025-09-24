/**
 * @file midi.js
 * @description MIDI input controller for the BOP Synthesizer.
 * Listens for MIDI messages and dispatches events via the event bus.
 */

export class MidiControl {
    /**
     * @param {EventTarget} eventBus The central event bus for the application.
     */
    constructor(eventBus) {
        console.log('[MIDI] Initializing MidiControl...');
        this.eventBus = eventBus;
        this.midi = null;
        
        // Find UI elements once
        this.midiInd = document.getElementById('midiInd');
        this.midiStat = document.getElementById('midiStat');
        
        this.initMIDI();
    }

    async initMIDI() {
        if (!navigator.requestMIDIAccess) {
            console.warn('[MIDI] Web MIDI API is not supported by this browser.');
            this.setMidiStatus('Not supported by browser');
            return;
        }

        console.log('[MIDI] Web MIDI API is supported. Requesting access...');
        try {
            this.midi = await navigator.requestMIDIAccess();
            console.log('[MIDI] MIDI access granted!', this.midi);

            this.updateConnectedDevices();

            // Listen for future device connections/disconnections
            this.midi.onstatechange = (event) => {
                console.log('%c[MIDI] MIDI state has changed!', 'color: orange; font-weight: bold;', event.port);
                this.updateConnectedDevices();
            };
        } catch (e) {
            console.error('[MIDI] Failed to get MIDI access:', e);
            this.setMidiStatus('Error requesting access');
        }
    }

    updateConnectedDevices() {
        if (!this.midi) return;
        
        const inputs = this.midi.inputs;
        console.log(`[MIDI] Found ${inputs.size} input(s).`);

        if (inputs.size > 0) {
            this.setMidiStatus(`Connected (${inputs.size})`);
            inputs.forEach(input => {
                console.log(`[MIDI] Attaching listener to: ${input.name} (State: ${input.state})`);
                // Important: Ensure onmidimessage is bound correctly to this instance
                input.onmidimessage = this.onMIDI.bind(this);
            });
        } else {
            this.setMidiStatus('No devices connected');
        }
    }

    setMidiStatus(txt) {
        if (this.midiStat) {
            this.midiStat.textContent = 'MIDI: ' + txt;
        }
        if (this.midiInd) {
            const isActive = txt.includes('Connected') && !txt.includes('No devices');
            this.midiInd.className = 'status-indicator' + (isActive ? ' active' : '');
        }
    }

    onMIDI(ev) {
        const [cmd, note, vel] = ev.data;
        // Use Tone.js, which is globally available after loading
        const n = window.Tone.Frequency(note, 'midi').toNote();

        // Note On (Command 144, velocity > 0)
        if (cmd === 144 && vel > 0) {
            console.log(`[MIDI] Note On: ${n} (Vel: ${vel}). Dispatching midi-note-on.`);
            // **FIX:** Dispatch an event instead of calling another module directly
            this.eventBus.dispatchEvent(new CustomEvent('midi-note-on', {
                detail: { note: n, velocity: vel }
            }));
        } 
        // Note Off (Command 128, or Command 144 with velocity 0)
        else if (cmd === 128 || (cmd === 144 && vel === 0)) {
            console.log(`[MIDI] Note Off: ${n}. Dispatching midi-note-off.`);
            // **FIX:** Dispatch an event
            this.eventBus.dispatchEvent(new CustomEvent('midi-note-off', {
                detail: { note: n }
            }));
        }
    }
}