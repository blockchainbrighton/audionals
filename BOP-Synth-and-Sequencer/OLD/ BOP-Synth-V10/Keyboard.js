/**
 * @file Keyboard.js
 * @description Virtual keyboard UI component for the BOP Synthesizer.
 * Refactored to use event-driven communication instead of direct module calls.
 */

export class Keyboard {
    constructor(keyboardSelector, eventBus, state) {
        this.keyboardSelector = keyboardSelector;
        this.eventBus = eventBus;
        this.state = state;
        
        this.WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        this.BLACKS = { 0: 'C#', 1: 'D#', 3: 'F#', 4: 'G#', 5: 'A#' };
        
        this.keyboard = null;
        this.Tone = null; // Will be set when available
        
        this.init();
    }
    
    init() {
        this.keyboard = document.querySelector(this.keyboardSelector);
        if (!this.keyboard) {
            console.error(`[Keyboard] Element not found: ${this.keyboardSelector}`);
            return;
        }
        
        this.setupOctaveControls();
        this.setupEventListeners();
        this.draw();
    }
    
    setupOctaveControls() {
        const octaveUp = document.getElementById('octaveUp');
        const octaveDown = document.getElementById('octaveDown');
        
        if (octaveUp) {
            octaveUp.onclick = () => {
                if (this.state.curOct < 7) {
                    this.state.curOct++;
                    this.updateOctaveLabel();
                    this.draw();
                    
                    // Emit octave change event
                    this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
                        detail: { octave: this.state.curOct }
                    }));
                }
            };
        }
        
        if (octaveDown) {
            octaveDown.onclick = () => {
                if (this.state.curOct > 0) {
                    this.state.curOct--;
                    this.updateOctaveLabel();
                    this.draw();
                    
                    // Emit octave change event
                    this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
                        detail: { octave: this.state.curOct }
                    }));
                }
            };
        }
    }
    
    setupEventListeners() {
        // Listen for keyboard redraw requests
        this.eventBus.addEventListener('keyboard-redraw', () => {
            this.draw();
        });
        
        // Listen for note visual changes
        this.eventBus.addEventListener('keyboard-note-visual', (e) => {
            const { note, active } = e.detail;
            this.updateKeyVisual(note, active);
        });
        
        // Listen for release all keys command
        this.eventBus.addEventListener('release-all-keys', () => {
            this.releaseAllKeys();
        });
        
        // Listen for Tone.js availability
        this.eventBus.addEventListener('tone-ready', (e) => {
            this.Tone = e.detail.Tone;
            this.draw();
        });
    }
    
    updateOctaveLabel() {
        const octaveLabel = document.getElementById('octaveLabel');
        if (octaveLabel) {
            octaveLabel.textContent = 'Octave: ' + this.state.curOct;
        }
    }

    draw() {
        if (!this.keyboard) {
            console.warn('[Keyboard] Cannot draw; keyboard element not found.');
            return;
        }
        
        // Use global Tone if not set locally
        const Tone = this.Tone || window.Tone;
        if (!Tone || !this.state) {
            console.warn('[Keyboard] Cannot draw; dependencies (Tone.js or state) are not ready.');
            return;
        }

        this.keyboard.innerHTML = '';
        const kbWidth = this.keyboard.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        // Draw white keys
        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = this.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            const midi = Tone.Frequency(`${wn}${this.state.curOct + octaveOffset}`).toMidi();
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
        
        // Draw black keys
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (this.BLACKS.hasOwnProperty(whiteIndex % 7)) {
                const wn = this.WHITE_NOTES[whiteIndex % 7];
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNote = this.BLACKS[whiteIndex % 7] + (this.state.curOct + octaveOffset);
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
    }

    addKeyHandlers(el, note) {
        // Mouse events
        el.onmousedown = () => {
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-on', {
                detail: { note, velocity: 0.8 }
            }));
        };
        
        el.onmouseup = () => {
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
                detail: { note }
            }));
        };
        
        el.onmouseleave = () => {
            // Only release if the key is actually active to prevent double-releasing
            if (this.state.activeNotes.has(note)) {
                this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
                    detail: { note }
                }));
            }
        };
        
        // Touch events
        el.ontouchstart = e => { 
            e.preventDefault(); 
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-on', {
                detail: { note, velocity: 0.8 }
            }));
        };
        
        el.ontouchend = e => { 
            e.preventDefault(); 
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
                detail: { note }
            }));
        };
        
        // Keyboard events (for accessibility)
        el.onkeydown = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-on', {
                    detail: { note, velocity: 0.8 }
                }));
            }
        };
        
        el.onkeyup = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
                    detail: { note }
                }));
            }
        };
    }

    updateKeyVisual(note, on) {
        if (!this.keyboard) return;
        
        // More efficient: directly query for the specific key
        const keyElement = this.keyboard.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.toggle('active', !!on);
        }
    }

    /**
     * Releases all visually active keys on the keyboard.
     * This is crucial for stopping playback/recording to prevent "stuck" keys.
     */
    releaseAllKeys() {
        if (!this.keyboard) return;
        
        // Find all elements that have the 'active' class and remove it.
        this.keyboard.querySelectorAll('.active').forEach(activeKey => {
            activeKey.classList.remove('active');
        });
        console.log('[Keyboard] All visual keys released.');
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        if (this.keyboard) {
            this.keyboard.innerHTML = '';
        }
        // Event listeners will be cleaned up when eventBus is destroyed
    }
}

export default Keyboard;

