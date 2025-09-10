/**
 * Creates and manages an 88-key piano keyboard interface.
 * @param {object} engine - The synthesizer engine instance from engine.js.
 */
export function Keyboard(engine) {
    const keyboardContainer = document.getElementById('keyboard-container');
    if (!keyboardContainer) {
        console.error('Keyboard container not found!');
        return;
    }

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const totalKeys = 88;
    let startingNote = 'A0';

    // --- Create the Visual Keyboard ---
    function createKeyboard() {
        keyboardContainer.innerHTML = ''; // Clear previous keyboard
        let currentOctave = parseInt(startingNote.charAt(1));
        let noteIndex = notes.indexOf(startingNote.slice(0, -1));

        for (let i = 0; i < totalKeys; i++) {
            const noteName = notes[noteIndex];
            const fullNoteName = `${noteName}${currentOctave}`;
            const key = document.createElement('div');
            key.dataset.note = fullNoteName;

            if (noteName.includes('#')) {
                key.className = 'key black';
            } else {
                key.className = 'key white';
            }

            keyboardContainer.appendChild(key);

            // Move to the next note
            noteIndex++;
            if (noteIndex >= notes.length) {
                noteIndex = 0;
                currentOctave++;
            }
        }
    }

    // --- Event Handlers for Playing Notes ---
    function addEventListeners() {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            // Mouse events
            key.addEventListener('mousedown', () => play(key));
            key.addEventListener('mouseup', () => stop(key));
            key.addEventListener('mouseleave', () => stop(key)); // Stop if mouse leaves key while pressed

            // Touch events for mobile
            key.addEventListener('touchstart', (e) => { e.preventDefault(); play(key); });
            key.addEventListener('touchend', (e) => { e.preventDefault(); stop(key); });
        });

        // Computer keyboard events
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    // --- Note Playing Logic ---
    function play(keyElement) {
        if (!keyElement || keyElement.classList.contains('active')) return;
        const note = keyElement.dataset.note;
        if (engine && typeof engine.playNote === 'function') {
            engine.playNote(note);
            keyElement.classList.add('active');
        }
    }

    function stop(keyElement) {
        if (!keyElement) return;
        const note = keyElement.dataset.note;
        if (engine && typeof engine.stopNote === 'function') {
            engine.stopNote(note);
            keyElement.classList.remove('active');
        }
    }

    // --- Computer Keyboard Mapping ---
    const keyMap = {
        'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4',
        't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
        'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5',
    };
    const pressedKeys = new Set();

    function handleKeyDown(e) {
        if (pressedKeys.has(e.key)) return; // Prevent re-triggering
        const note = keyMap[e.key];
        if (note) {
            pressedKeys.add(e.key);
            const keyElement = keyboardContainer.querySelector(`[data-note="${note}"]`);
            if (keyElement) play(keyElement);
        }
    }

    function handleKeyUp(e) {
        const note = keyMap[e.key];
        if (note) {
            pressedKeys.delete(e.key);
            const keyElement = keyboardContainer.querySelector(`[data-note="${note}"]`);
            if (keyElement) stop(keyElement);
        }
    }

    // --- Initialization ---
    createKeyboard();
    addEventListeners();

    // Expose a minimal API if needed later
    return {};
}