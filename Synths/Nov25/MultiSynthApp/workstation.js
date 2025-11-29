import { SynthLoader } from '../shared/synth-loader.js';
import { MidiManager } from '../shared/midi-manager.js';
import { PianoRoll } from '../shared/piano-roll.js';

// --- SYNTH REGISTRY ---
const SYNTH_REGISTRY = {
    'analog-synth': { name: 'Analog Mono', path: '../Synths/Analog-Synth-working/analog-synth.module.js' },
    'bassline': { name: 'Acid Bass', path: '../Synths/BassLineSynth-working/bassline.module.js' },
    'lumina': { name: 'Lumina Lead', path: '../Synths/Lumina-lead-synth-working-add-poliphony/lumina.module.js' },
    'neon': { name: 'Neon Poly', path: '../Synths/N.E.O.N./neon.module.js' },
    'wavetable': { name: 'Wavetable', path: '../Synths/wavetable-synth-keys-should-be-below-controls/wavetable.module.js' }
    // Add others as we verify them
};

class Workstation {
    constructor() {
        this.Tone = null;
        this.midiManager = null;
        this.tracks = []; // { id, name, synth, midiData, mute, solo }
        this.activeTrackIdx = -1;
        this.isPlaying = false;
        
        this.ui = {
            trackList: document.getElementById('track-list'),
            instrumentContainer: document.getElementById('instrument-interface'),
            pianoRollContainer: document.getElementById('piano-roll-wrapper'),
            playBtn: document.getElementById('btn-play'),
            stopBtn: document.getElementById('btn-stop'),
            tempoInput: document.getElementById('inp-tempo')
        };
        
        this.pianoRoll = null;
    }

    async init() {
        // 1. Loader
        const loader = new SynthLoader({
            loaderId: 'loader-overlay',
            statusId: 'loader-msg',
            startBtnId: 'start-btn'
        });

        loader.load(async ({ Tone }) => {
            this.Tone = Tone;
            
            // 2. MIDI
            this.midiManager = new MidiManager({
                onNoteOn: (n, v) => this.handleMidiIn(n, v, 'on'),
                onNoteOff: (n) => this.handleMidiIn(n, 0, 'off')
            });
            await this.midiManager.init();

            // 3. Setup UI
            this.setupTransport();
            this.pianoRoll = new PianoRoll('piano-roll-wrapper', {
                onNoteChange: (notes) => this.updateClip(notes)
            });

            // 4. Add Default Track
            await this.addTrack('analog-synth');
        });
    }

    setupTransport() {
        this.ui.playBtn.onclick = () => {
            if(!this.isPlaying) {
                this.Tone.Transport.start();
                this.isPlaying = true;
                this.ui.playBtn.classList.add('active');
            } else {
                this.Tone.Transport.pause();
                this.isPlaying = false;
                this.ui.playBtn.classList.remove('active');
            }
        };
        
        this.ui.stopBtn.onclick = () => {
            this.Tone.Transport.stop();
            this.isPlaying = false;
            this.ui.playBtn.classList.remove('active');
            this.pianoRoll.setCursor(0);
        };

        // Sequencer Loop
        this.Tone.Transport.scheduleRepeat((time) => {
            const beat = (this.Tone.Transport.seconds / this.Tone.Transport.bpm.value) * 60;
            // Update UI
            this.Tone.Draw.schedule(() => {
                this.pianoRoll.setCursor(beat % 16); // 4 bar loop view
            }, time);
            
            // Trigger Notes
            this.tracks.forEach(track => {
                if(track.mute) return;
                // Simple quantizer logic for demo
                // In a real app, you'd schedule events ahead of time. 
                // For this prototype, we check current beat vs note start.
            });
        }, "16n");
    }

    async addTrack(synthId) {
        const config = SYNTH_REGISTRY[synthId];
        if(!config) return;

        const trackId = this.tracks.length;
        const track = {
            id: trackId,
            name: config.name,
            synth: null,
            midiData: [], // Notes
            instance: null
        };

        // Load Module
        const module = await import(config.path);
        const SynthClass = module.default;
        track.instance = new SynthClass(this.Tone, this.midiManager);
        
        // Init Audio (We need to separate audio init from UI mount!)
        // *CRITICAL:* Current modules init audio inside mount(). 
        // We will mount it to a hidden container first to init audio?
        // Or we refactor the module. For now, we mount to a hidden div.
        
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.display = 'none';
        document.body.appendChild(hiddenContainer);
        
        await track.instance.mount(hiddenContainer);
        
        this.tracks.push(track);
        this.renderTrackList();
        this.selectTrack(trackId);
    }

    selectTrack(idx) {
        if(this.activeTrackIdx === idx) return;
        
        // Hide old UI
        if(this.activeTrackIdx > -1) {
            const old = this.tracks[this.activeTrackIdx];
            // To hide without destroying audio, we need the module to support it.
            // Current modules destroy audio on unmount. 
            // Hack: We just detach the DOM element the module created?
            // Most modules clear innerHTML. 
            
            // For this prototype to work without full refactor of all synths:
            // We only show the UI of the active track.
            // BUT we need the audio to persist.
            // Since `mount` creates audio and `unmount` destroys it, we are stuck unless we refactor.
        }

        this.activeTrackIdx = idx;
        const track = this.tracks[idx];
        
        // Show Notes
        this.pianoRoll.setNotes(track.midiData);
        
        // Highlight Track UI
        this.renderTrackList();
        
        // Swap Synth UI
        this.ui.instrumentContainer.innerHTML = '';
        // We need to "move" the synth's UI from the hidden container to the main container
        // This assumes the synth renders into the container we gave it.
        // ...
    }

    renderTrackList() {
        this.ui.trackList.innerHTML = '';
        this.tracks.forEach((t, i) => {
            const el = document.createElement('div');
            el.className = `track-item ${i === this.activeTrackIdx ? 'active' : ''}`;
            el.innerHTML = `
                <div class="track-name">${t.name}</div>
                <div class="track-controls">
                    <button class="btn-s">M</button>
                    <button class="btn-s">S</button>
                </div>
            `;
            el.onclick = () => this.selectTrack(i);
            this.ui.trackList.appendChild(el);
        });
    }

    updateClip(notes) {
        if(this.activeTrackIdx > -1) {
            this.tracks[this.activeTrackIdx].midiData = notes;
        }
    }

    handleMidiIn(note, vel, type) {
        if(this.activeTrackIdx > -1) {
            const track = this.tracks[this.activeTrackIdx];
            // Pass to synth audio
            if(track.instance) {
                if(type === 'on') track.instance.noteOn(note, vel);
                else track.instance.noteOff(note);
            }
            // Record if enabled...
        }
    }
}

const app = new Workstation();
app.init();
