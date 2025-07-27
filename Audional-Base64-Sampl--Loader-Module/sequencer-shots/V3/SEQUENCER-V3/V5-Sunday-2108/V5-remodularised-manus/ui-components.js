// ui-components.js - UI components including keyboard, transport controls, and MIDI
// Dependencies: Tone.js (global), EnhancedRecorder (global)

const Keyboard = {
    WHITE_NOTES: ['C','D','E','F','G','A','B'],
    BLACKS: { 0:'C#', 1:'D#', 3:'F#', 4:'G#', 5:'A#' },

    init() {
        this.keyboard = document.getElementById('keyboard');
        this.setupOctaveControls();
        this.draw();
        this.bindKeyboardShortcuts();
    },

    setupOctaveControls() {
        document.getElementById('octaveUp').onclick = () => {
            if (window.synthApp.curOct < 7) {
                window.synthApp.curOct++;
                document.getElementById('octaveLabel').textContent = 'Octave: ' + window.synthApp.curOct;
                this.draw();
            }
        };
        document.getElementById('octaveDown').onclick = () => {
            if (window.synthApp.curOct > 0) {
                window.synthApp.curOct--;
                document.getElementById('octaveLabel').textContent = 'Octave: ' + window.synthApp.curOct;
                this.draw();
            }
        };
    },

    draw() {
        this.keyboard.innerHTML = '';
        const kbWidth = this.keyboard.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = this.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            const midi = Tone.Frequency(`${wn}${window.synthApp.curOct + octaveOffset}`).toMidi();
            const note = Tone.Frequency(midi, "midi").toNote();

            const wkey = document.createElement('div');
            wkey.className = 'key-white';
            wkey.dataset.note = note;
            wkey.style.left = (i * whiteKeyW) + '%';
            wkey.style.width = whiteKeyW + '%';
            wkey.tabIndex = 0;
            this.addKeyHandlers(wkey, note);

            if (wn === "C" || wn === "F") {
                const lbl = document.createElement('span');
                lbl.className = 'key-label';
                lbl.innerText = note;
                wkey.appendChild(lbl);
            }
            this.keyboard.appendChild(wkey);
            whiteIndex++;
        }
        
        // Black keys
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (this.BLACKS.hasOwnProperty(whiteIndex % 7)) {
                const wn = this.WHITE_NOTES[whiteIndex % 7];
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNote = this.BLACKS[whiteIndex % 7] + (window.synthApp.curOct + octaveOffset);
                const midi = Tone.Frequency(blackNote).toMidi();
                const bkey = document.createElement('div');
                bkey.className = 'key-black';
                bkey.dataset.note = Tone.Frequency(midi, "midi").toNote();
                const leftPercent = (i + 0.7) * whiteKeyW - (whiteKeyW * 0.28);
                bkey.style.left = leftPercent + '%';
                bkey.style.width = (whiteKeyW * 0.62) + '%';
                bkey.tabIndex = 0;
                this.addKeyHandlers(bkey, bkey.dataset.note);
                this.keyboard.appendChild(bkey);
            }
            whiteIndex++;
        }
    },

    addKeyHandlers(el, note) {
        el.onmousedown   = () => window.EnhancedRecorder?.playNote(note);
        el.onmouseup     = () => window.EnhancedRecorder?.releaseNote(note);
        el.onmouseleave  = () => window.EnhancedRecorder?.releaseNote(note);
        el.ontouchstart  = e => { e.preventDefault(); window.EnhancedRecorder?.playNote(note); }
        el.ontouchend    = e => { e.preventDefault(); window.EnhancedRecorder?.releaseNote(note); }
        
        // Keyboard focus handlers
        el.onfocus = () => el.classList.add('focused');
        el.onblur = () => el.classList.remove('focused');
        
        // Keyboard key handlers
        el.onkeydown = (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                window.EnhancedRecorder?.playNote(note);
            }
        };
        el.onkeyup = (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                window.EnhancedRecorder?.releaseNote(note);
            }
        };
    },

    updateKeyVisual(note, on) {
        this.keyboard.querySelectorAll('.key-white,.key-black').forEach(k => {
            if (k.dataset.note === note) k.classList.toggle('active', !!on);
        });
    },

    bindKeyboardShortcuts() {
        // Computer keyboard to piano mapping
        const keyMap = {
            'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E', 'f': 'F',
            't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A', 'u': 'A#', 'j': 'B',
            'k': 'C', 'o': 'C#', 'l': 'D', 'p': 'D#', ';': 'E'
        };

        const activeKeys = new Set();

        document.addEventListener('keydown', (e) => {
            if (e.repeat || activeKeys.has(e.key)) return;
            
            const noteName = keyMap[e.key.toLowerCase()];
            if (noteName) {
                activeKeys.add(e.key);
                const octave = e.key === e.key.toLowerCase() ? window.synthApp.curOct : window.synthApp.curOct + 1;
                const note = noteName + octave;
                window.EnhancedRecorder?.playNote(note);
                this.updateKeyVisual(note, true);
            }
        });

        document.addEventListener('keyup', (e) => {
            const noteName = keyMap[e.key.toLowerCase()];
            if (noteName && activeKeys.has(e.key)) {
                activeKeys.delete(e.key);
                const octave = e.key === e.key.toLowerCase() ? window.synthApp.curOct : window.synthApp.curOct + 1;
                const note = noteName + octave;
                window.EnhancedRecorder?.releaseNote(note);
                this.updateKeyVisual(note, false);
            }
        });
    },

    // Utility methods
    highlightKey(note, duration = 500) {
        const key = this.keyboard.querySelector(`[data-note="${note}"]`);
        if (key) {
            key.classList.add('highlighted');
            setTimeout(() => key.classList.remove('highlighted'), duration);
        }
    },

    getVisibleNotes() {
        return Array.from(this.keyboard.querySelectorAll('.key-white, .key-black'))
            .map(key => key.dataset.note);
    }
};

const Transport = {
    init() {
        console.log('Transport controls initializing...');
        this.createTransportUI();
        this.bindTransportEvents();
    },

    createTransportUI() {
        const el = document.getElementById('transport-controls');
        el.innerHTML = `
            <div class="transport-row">
                <button id="recordBtn" class="transport-button record-btn">
                    <span class="transport-icon">●</span>Record
                </button>
                <button id="stopBtn" class="transport-button stop-btn" disabled>
                    <span class="transport-icon">■</span>Stop
                </button>
                <button id="playBtn" class="transport-button play-btn" disabled>
                    <span class="transport-icon">▶</span>Play
                </button>
                <button id="clearBtn" class="transport-button clear-btn">
                    <span class="transport-icon">🗑</span>Clear
                </button>
            </div>
            <div class="transport-status">
                <div id="recInd" class="status-indicator"></div>
                <div id="recStat" class="status-text">Status: Inactive</div>
            </div>
        `;
    },

    bindTransportEvents() {
        // Wire up events to EnhancedRecorder module
        document.getElementById('recordBtn').onclick = () => window.EnhancedRecorder?.onRecord();
        document.getElementById('stopBtn').onclick = () => window.EnhancedRecorder?.onStop();
        document.getElementById('playBtn').onclick = () => window.EnhancedRecorder?.onPlay();
        document.getElementById('clearBtn').onclick = () => window.EnhancedRecorder?.onClear();

        // Store references for state updates
        if (window.EnhancedRecorder) {
            window.EnhancedRecorder.buttons = {
                record: document.getElementById('recordBtn'),
                stop: document.getElementById('stopBtn'),
                play: document.getElementById('playBtn'),
                clear: document.getElementById('clearBtn'),
            };
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) return; // Don't interfere with system shortcuts
            
            switch(e.key) {
                case 'r':
                case 'R':
                    if (!e.repeat) window.EnhancedRecorder?.onRecord();
                    break;
                case ' ':
                    e.preventDefault();
                    if (window.synthApp?.isPlaying) {
                        window.EnhancedRecorder?.onStop();
                    } else if (window.synthApp?.seq?.length) {
                        window.EnhancedRecorder?.onPlay();
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (e.target.tagName !== 'INPUT') {
                        e.preventDefault();
                        window.EnhancedRecorder?.onClear();
                    }
                    break;
            }
        });
    },

    updateButtonStates(isRecording, isPlaying, hasSequence) {
        const buttons = window.EnhancedRecorder?.buttons;
        if (!buttons) return;

        buttons.record.disabled = isPlaying;
        buttons.stop.disabled = !isRecording && !isPlaying;
        buttons.play.disabled = isRecording || !hasSequence;
        buttons.clear.disabled = isRecording || isPlaying;

        // Update visual states
        buttons.record.classList.toggle('active', isRecording);
        buttons.play.classList.toggle('active', isPlaying);
    }
};

const MidiControl = {
    midi: null,
    midiInd: null,
    midiStat: null,

    init() {
        this.midiInd = document.getElementById('midiInd');
        this.midiStat = document.getElementById('midiStat');
        this.createMidiUI();
        this.initMIDI();
    },

    createMidiUI() {
        // Create MIDI status display if it doesn't exist
        if (!this.midiStat) {
            const statusContainer = document.createElement('div');
            statusContainer.className = 'midi-status-container';
            statusContainer.innerHTML = `
                <div id="midiInd" class="status-indicator"></div>
                <div id="midiStat" class="status-text">MIDI: Checking...</div>
            `;
            
            const transportEl = document.getElementById('transport-controls');
            if (transportEl) {
                transportEl.appendChild(statusContainer);
                this.midiInd = document.getElementById('midiInd');
                this.midiStat = document.getElementById('midiStat');
            }
        }
    },

    async initMIDI() {
        if (navigator.requestMIDIAccess) {
            try {
                this.midi = await navigator.requestMIDIAccess();
                this.setMidiStatus(`Connected (${this.midi.inputs.size})`);
                this.midi.inputs.forEach(input => {
                    input.onmidimessage = this.onMIDI.bind(this);
                    console.log(`[MidiControl] Connected to: ${input.name}`);
                });
                this.midi.onstatechange = () => {
                    this.setMidiStatus(`Connected (${this.midi.inputs.size})`);
                    this.updateInputHandlers();
                };
            } catch (e) {
                console.error('[MidiControl] MIDI access error:', e);
                this.setMidiStatus('Error');
            }
        } else {
            this.setMidiStatus('Not supported');
        }
    },

    updateInputHandlers() {
        if (this.midi) {
            this.midi.inputs.forEach(input => {
                input.onmidimessage = this.onMIDI.bind(this);
            });
        }
    },

    setMidiStatus(txt) {
        if (this.midiStat) {
            this.midiStat.textContent = 'MIDI: ' + txt;
        }
        if (this.midiInd) {
            this.midiInd.className = 'status-indicator' + (txt.includes('Connected') ? ' active' : '');
        }
    },

    onMIDI(ev) {
        let [cmd, note, vel] = ev.data;
        let n = Tone.Frequency(note, 'midi').toNote();
        
        // Note on (velocity > 0)
        if (cmd === 144 && vel > 0) {
            window.EnhancedRecorder?.playNote(n);
            Keyboard.updateKeyVisual(n, true);
        } 
        // Note off (cmd 128 or velocity 0)
        else if (cmd === 128 || (cmd === 144 && vel === 0)) {
            window.EnhancedRecorder?.releaseNote(n);
            Keyboard.updateKeyVisual(n, false);
        }
        // Control change messages
        else if (cmd === 176) {
            this.handleControlChange(note, vel);
        }
    },

    handleControlChange(controller, value) {
        // Map common MIDI controllers to synth parameters
        const normalizedValue = value / 127;
        
        switch(controller) {
            case 1: // Modulation wheel
                if (window.EnhancedEffects) {
                    window.EnhancedEffects.setVibratoLFO({ depth: normalizedValue * 0.1 });
                }
                break;
            case 7: // Volume
                if (window.AudioSafety) {
                    window.AudioSafety.setMasterVolume(normalizedValue);
                }
                break;
            case 74: // Filter cutoff
                if (window.EnhancedEffects) {
                    window.EnhancedEffects.setFilter({ frequency: 200 + normalizedValue * 4800 });
                }
                break;
            case 71: // Filter resonance
                if (window.EnhancedEffects) {
                    window.EnhancedEffects.setFilter({ Q: normalizedValue * 20 });
                }
                break;
            case 91: // Reverb
                if (window.EnhancedEffects) {
                    window.EnhancedEffects.setReverb({ wet: normalizedValue });
                }
                break;
            case 93: // Delay
                if (window.EnhancedEffects) {
                    window.EnhancedEffects.setDelay({ wet: normalizedValue });
                }
                break;
        }
    },

    // Get list of connected MIDI devices
    getConnectedDevices() {
        if (!this.midi) return [];
        return Array.from(this.midi.inputs.values()).map(input => ({
            id: input.id,
            name: input.name,
            manufacturer: input.manufacturer,
            state: input.state
        }));
    }
};

// UI Utilities
const UIUtils = {
    // Create a styled button element
    createButton(text, onClick, className = 'ui-button') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = className;
        btn.onclick = onClick;
        return btn;
    },

    // Create a labeled slider control
    createSlider(label, min, max, value, onChange, step = 0.01) {
        const container = document.createElement('div');
        container.className = 'slider-container';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.step = step;
        slider.oninput = (e) => onChange(parseFloat(e.target.value));
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'slider-value';
        valueDisplay.textContent = value;
        
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            valueDisplay.textContent = val.toFixed(2);
            onChange(val);
        };
        
        container.appendChild(labelEl);
        container.appendChild(slider);
        container.appendChild(valueDisplay);
        
        return { container, slider, valueDisplay };
    },

    // Show a temporary notification
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, duration);
    },

    // Format numbers for display
    formatValue(value, decimals = 2) {
        if (typeof value === 'number') {
            return value.toFixed(decimals);
        }
        return value.toString();
    },

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Export modules for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Keyboard, Transport, MidiControl, UIUtils };
} else {
    window.Keyboard = Keyboard;
    window.Transport = Transport;
    window.MidiControl = MidiControl;
    window.UIUtils = UIUtils;
}

