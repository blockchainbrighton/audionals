/**
 * @file midi.js
 * @description MIDI input controller for the BOP Synthesizer.
 */

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
        const [cmd, note, vel] = ev.data;
        const n = window.Tone.Frequency(note, 'midi').toNote();
        const velocity = Math.max(0, Math.min(1, vel / 127));
        if (cmd === 144 && vel > 0) {
            this.eventBus.dispatchEvent(new CustomEvent('midi-note-on', { detail: { note: n, velocity } }));
        }
        else if (cmd === 128 || (cmd === 144 && vel === 0)) {
            this.eventBus.dispatchEvent(new CustomEvent('midi-note-off', { detail: { note: n } }));
        }
    }

    destroy() {
        this.attachedInputs.forEach(input => input.onmidimessage = null);
        this.attachedInputs.clear();
        if (this.midi) this.midi.onstatechange = null;
        console.log('[MIDI] MidiControl destroyed and listeners removed.');
    }

}
