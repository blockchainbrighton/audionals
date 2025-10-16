/**
 * @file Keyboard.js
 * @description Virtual keyboard UI component for the BOP Synthesizer.
 * Refactored to use event-driven communication and true dependency injection.
 */

// REMOVED: import { Tone } from './Tone.js'; // <<< FIX: This was causing the 404 error.

export class Keyboard {
    // Static properties for note definitions
    static WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    static BLACK_NOTES = { 0: 'C#', 1: 'D#', 3: 'F#', 4: 'G#', 5: 'A#' };

    /**
     * @param {string} containerSelector - The CSS selector for the keyboard container element.
     * @param {EventTarget} eventBus - The event bus for dispatching actions.
     * @param {object} state - The shared application state (for reading curOct).
     * @param {object} Tone - The fully loaded Tone.js library instance. // <<< FIX: Added Tone as a dependency.
     */
    constructor(containerSelector, eventBus, state, Tone) {
        this.container = document.querySelector(containerSelector);
        this.octaveUpBtn = document.getElementById('octaveUp');
        this.octaveDownBtn = document.getElementById('octaveDown');
        this.octaveLabel = document.getElementById('octaveLabel');
        
        if (!this.container || !this.octaveUpBtn || !this.octaveDownBtn || !this.octaveLabel) {
            throw new Error('[Keyboard] A required DOM element was not found.');
        }

        // <<< FIX: Store the injected dependencies.
        this.eventBus = eventBus;
        this.state = state;
        this.Tone = Tone; 

        if (!this.Tone) {
            throw new Error('[Keyboard] Tone.js instance was not provided to the constructor.');
        }
        
        this.init();
    }

    init() {
        this.octaveUpBtn.onclick = () => this.changeOctave(1);
        this.octaveDownBtn.onclick = () => this.changeOctave(-1);
        
        this.eventBus.addEventListener('keyboard-redraw', () => this.draw());
        this.eventBus.addEventListener('keyboard-note-visual', (e) => this.updateKeyVisual(e.detail.note, e.detail.active));
        this.eventBus.addEventListener('release-all-keys', () => this.releaseAllKeys());
        
        this.draw();
        console.log('[Keyboard] UI Component Initialized.');
    }

    changeOctave(direction) {
        // ... (this method is unchanged)
        const newOctave = this.state.curOct + direction;
        if (newOctave >= 0 && newOctave <= 7) {
            this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
                detail: { octave: newOctave }
            }));
            this.octaveLabel.textContent = `Octave: ${newOctave}`;
        }
    }

    draw() {
        // <<< FIX: Check for the instance variable `this.Tone` instead of a global one.
        if (!this.Tone) { 
            console.warn('[Keyboard] Cannot draw; Tone.js is not ready.');
            return;
        }

        this.container.innerHTML = '';
        const kbWidth = this.container.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = Keyboard.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            // <<< FIX: Use `this.Tone`
            const note = this.Tone.Frequency(`${wn}${this.state.curOct + octaveOffset}`).toNote(); 

            const wkey = this.createKey('key-white', note);
            wkey.style.left = (i * whiteKeyW) + '%';
            wkey.style.width = whiteKeyW + '%';

            if (wn === "C" || wn === "F") {
                const lbl = document.createElement('span');
                lbl.className = 'key-label';
                lbl.innerText = note;
                wkey.appendChild(lbl);
            }
            this.container.appendChild(wkey);
            whiteIndex++;
        }
        
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (Keyboard.BLACK_NOTES.hasOwnProperty(whiteIndex % 7)) {
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNoteName = Keyboard.BLACK_NOTES[whiteIndex % 7];
                 // <<< FIX: Use `this.Tone`
                const note = this.Tone.Frequency(`${blackNoteName}${this.state.curOct + octaveOffset}`).toNote();
                
                const bkey = this.createKey('key-black', note);
                const leftPercent = (i + 0.7) * whiteKeyW - (whiteKeyW * 0.28);
                bkey.style.left = leftPercent + '%';
                bkey.style.width = (whiteKeyW * 0.62) + '%';
                this.container.appendChild(bkey);
            }
            whiteIndex++;
        }
    }

    createKey(className, note) {
        const keyEl = document.createElement('div');
        keyEl.className = className;
        keyEl.dataset.note = note;
        keyEl.tabIndex = 0;
        this.addKeyHandlers(keyEl, note);
        return keyEl;
    }

    addKeyHandlers(el, note) {
        const play = () => {
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-on', {
                detail: { note, velocity: 1.0 }
            }));
        };
        const release = () => {
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
                detail: { note }
            }));
        };

        el.onmousedown = play;
        el.onmouseup = release;
        el.onmouseleave = release; // Simplified: release on mouse leave
        el.ontouchstart = e => { e.preventDefault(); play(); };
        el.ontouchend = e => { e.preventDefault(); release(); };
    }

    updateKeyVisual(note, on) {
        const keyElement = this.container.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.toggle('active', !!on);
        }
    }

    releaseAllKeys() {
        this.container.querySelectorAll('.active').forEach(activeKey => {
            activeKey.classList.remove('active');
        });
        console.log('[Keyboard] All visual keys released.');
    }
}

export default Keyboard;

