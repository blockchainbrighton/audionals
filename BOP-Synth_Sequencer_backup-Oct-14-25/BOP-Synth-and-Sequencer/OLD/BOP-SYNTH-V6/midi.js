 // --- midi.js ---

 export const MidiControl = {
    init() {
        console.log('[MIDI] Initializing MidiControl...');
        this.midiInd  = document.getElementById('midiInd');
        this.midiStat = document.getElementById('midiStat');
        this.initMIDI();
    },

    async initMIDI() {
        if (navigator.requestMIDIAccess) {
            console.log('[MIDI] Web MIDI API is supported by this browser.');
            try {
                console.log('[MIDI] Requesting MIDI access...');
                this.midi = await navigator.requestMIDIAccess();
                console.log('[MIDI] MIDI access granted!', this.midi);

                // Log all currently connected devices
                this.logConnectedDevices();
                this.setMidiStatus(`Connected (${this.midi.inputs.size})`);

                // Add listener for every input device
                this.midi.inputs.forEach(input => {
                    console.log(`[MIDI] Attaching message listener to input: ${input.name} (Manufacturer: ${input.manufacturer})`);
                    input.onmidimessage = this.onMIDI.bind(this);
                });
                
                // This is the key part for when you plug in a device later
                this.midi.onstatechange = (event) => {
                    console.log('%c[MIDI] MIDI state has changed!', 'color: orange; font-weight: bold;', event);
                    const port = event.port;
                    console.log(`[MIDI] Device: ${port.name}, Type: ${port.type}, State: ${port.state}, Connection: ${port.connection}`);
                    
                    // Re-scan devices and update UI
                    this.logConnectedDevices();
                    this.setMidiStatus(`State Change (${this.midi.inputs.size} inputs)`);
                };

            } catch (e) {
                console.error('[MIDI] Failed to get MIDI access:', e);
                this.setMidiStatus('Error requesting access');
            }
        } else {
            console.warn('[MIDI] Web MIDI API is not supported by this browser.');
            this.setMidiStatus('Not supported by browser');
        }
    },
    
    logConnectedDevices() {
        if (!this.midi) return;
        console.log(`[MIDI] Found ${this.midi.inputs.size} input(s) and ${this.midi.outputs.size} output(s).`);
        if (this.midi.inputs.size > 0) {
            console.log('[MIDI] --- Available MIDI Inputs ---');
            this.midi.inputs.forEach(input => {
                console.log(`  - Name: ${input.name}, Manufacturer: ${input.manufacturer}, State: ${input.state}`);
            });
        }
    },

    setMidiStatus(txt) {
        console.log(`[MIDI] Setting status to: "${txt}"`);
        this.midiStat.textContent = 'MIDI: ' + txt;
        this.midiInd.className = 'status-indicator' + (txt.includes('Connected') || txt.includes('State Change') ? ' active' : '');
    },

    onMIDI(ev) {
        const [cmd, note, vel] = ev.data;
        const deviceName = ev.target.name || 'Unknown Device';

        // Log the raw incoming message
        console.log(`[MIDI] Message from [${deviceName}]:`, {
            rawData: ev.data,
            command: cmd,
            note,
            velocity: vel,
        });

        const n = Tone.Frequency(note, 'midi').toNote();
        
        // Note On
        if (cmd === 144 && vel > 0) {
            console.log(`[MIDI] Note On: ${n} (Velocity: ${vel}). Triggering playNote.`);
            EnhancedRecorder.playNote(n);
        // Note Off
        } else if (cmd === 128 || (cmd === 144 && vel === 0)) {
            console.log(`[MIDI] Note Off: ${n}. Triggering releaseNote.`);
            EnhancedRecorder.releaseNote(n);
        // Other MIDI messages (like control changes, pitch bend, etc.)
        } else {
            console.log(`[MIDI] Received unhandled command: ${cmd}`);
        }
    }
};

   


