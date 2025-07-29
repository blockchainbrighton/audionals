// Keyboard.js

import EnhancedRecorder from './EnhancedRecorder.js';

const Keyboard = {
    WHITE_NOTES: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    BLACKS: { 0: 'C#', 1: 'D#', 3: 'F#', 4: 'G#', 5: 'A#' },

    init() {
        this.keyboard = document.getElementById('keyboard');
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
        this.draw();
    },

    draw() {
        if (!this.keyboard || !window.Tone || !window.synthApp) {
            console.warn('[Keyboard] Cannot draw; dependencies (element, Tone.js, or synthApp) are not ready.');
            return;
        }

        this.keyboard.innerHTML = '';
        const kbWidth = this.keyboard.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = this.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            const midi = window.Tone.Frequency(`${wn}${window.synthApp.curOct + octaveOffset}`).toMidi();
            const note = window.Tone.Frequency(midi, "midi").toNote();

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
        
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (this.BLACKS.hasOwnProperty(whiteIndex % 7)) {
                const wn = this.WHITE_NOTES[whiteIndex % 7];
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNote = this.BLACKS[whiteIndex % 7] + (window.synthApp.curOct + octaveOffset);
                const midi = window.Tone.Frequency(blackNote).toMidi();
                const bkey = document.createElement('div');
                bkey.className = 'key-black';
                bkey.dataset.note = window.Tone.Frequency(midi, "midi").toNote();
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
        el.onmousedown = () => EnhancedRecorder.playNote(note);
        el.onmouseup = () => EnhancedRecorder.releaseNote(note);
        el.onmouseleave = () => {
            // Only release if the key is actually active to prevent double-releasing
            if (window.synthApp.activeNotes.has(note)) {
                EnhancedRecorder.releaseNote(note);
            }
        };
        el.ontouchstart = e => { e.preventDefault(); EnhancedRecorder.playNote(note); };
        el.ontouchend = e => { e.preventDefault(); EnhancedRecorder.releaseNote(note); };
    },

    updateKeyVisual(note, on) {
        if (!this.keyboard) return;
        // More efficient: directly query for the specific key
        const keyElement = this.keyboard.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.toggle('active', !!on);
        }
    },

    /**
     * **THE NEW FUNCTION**
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
};

export default Keyboard;