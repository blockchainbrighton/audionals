/**
 * @file midi.js
 * @description MIDI input controller for the BOP Synthesizer.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi) {
    if (midi < 0 || midi > 127 || Number.isNaN(midi)) return 'C4';
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_NAMES[midi % 12];
    return `${name}${octave}`;
}

export class MidiControl {
    constructor(eventBus) {
        console.log('[MIDI] Initializing MidiControl...');
        this.eventBus = eventBus;
        this.midi = null;
        this.attachedInputs = new Set();

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
        try {
            this.midi = await navigator.requestMIDIAccess();
            this.updateConnectedDevices();
            this.midi.onstatechange = (event) => this.updateConnectedDevices();
        } catch (e) {
            console.error('[MIDI] Failed to get MIDI access:', e);
            this.setMidiStatus('Error requesting access');
        }
    }

    updateConnectedDevices() {
        if (!this.midi) return;
        const inputs = this.midi.inputs;
        this.attachedInputs.forEach(input => input.onmidimessage = null);
        this.attachedInputs.clear();

        if (inputs.size > 0) {
            this.setMidiStatus(`Connected (${inputs.size})`);
            inputs.forEach(input => {
                input.onmidimessage = this.onMIDI.bind(this);
                this.attachedInputs.add(input);
            });
        } else {
            this.setMidiStatus('No devices connected');
        }
    }

    setMidiStatus(txt) {
        if (this.midiStat) this.midiStat.textContent = 'MIDI: ' + txt;
        if (this.midiInd) {
            const isActive = txt.includes('Connected') && !txt.includes('No devices');
            this.midiInd.className = 'status-indicator' + (isActive ? ' active' : '');
        }
    }

    onMIDI(ev) {
        const data = ev?.data;
        if (!data || data.length < 3) return;

        const status = data[0] & 0xf0;
        const noteValue = data[1];
        const velocity = data[2];
        const note = midiToNoteName(noteValue);

        if (status === 0x90 && velocity > 0) {
            this.eventBus.dispatchEvent(new CustomEvent('midi-note-on', { detail: { note, velocity } }));
        } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
            this.eventBus.dispatchEvent(new CustomEvent('midi-note-off', { detail: { note } }));
        }
    }

    destroy() {
        this.attachedInputs.forEach(input => input.onmidimessage = null);
        this.attachedInputs.clear();
        if (this.midi) this.midi.onstatechange = null;
        console.log('[MIDI] MidiControl destroyed and listeners removed.');
    }

}
