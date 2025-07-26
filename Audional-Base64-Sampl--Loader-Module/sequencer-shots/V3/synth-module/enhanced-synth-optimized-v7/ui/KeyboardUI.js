/**
 * KeyboardUI - Virtual keyboard interface
 * Handles keyboard display, interaction, and note triggering
 */
import { stateManager } from '../core/StateManager.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { errorHandler } from '../core/ErrorHandler.js';
import { DOMUtils } from '../utils/DOMUtils.js';

export class KeyboardUI {
    constructor() {
        this.currentOctave = 4;
        this.keyboardContainer = null;
        this.activeKeys = new Set();
        this.keyMap = new Map();
        this.isInitialized = false;
        
        // Computer keyboard mapping
        this.computerKeyMap = new Map([
            ['KeyA', 'C'],
            ['KeyW', 'C#'],
            ['KeyS', 'D'],
            ['KeyE', 'D#'],
            ['KeyD', 'F'],
            ['KeyF', 'F#'],
            ['KeyT', 'G'],
            ['KeyG', 'G#'],
            ['KeyY', 'A'],
            ['KeyH', 'A#'],
            ['KeyU', 'B'],
            ['KeyJ', 'C'],
            ['KeyI', 'C#'],
            ['KeyK', 'D'],
            ['KeyO', 'D#'],
            ['KeyL', 'E']
        ]);
    }

    /**
     * Initialize the keyboard UI
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.keyboardContainer = document.getElementById('keyboard');
            if (!this.keyboardContainer) {
                throw new Error('Keyboard container not found');
            }

            this.createKeyboard();
            this.setupEventListeners();
            this.loadKeyboardState();
            
            this.isInitialized = true;
            errorHandler.info('Keyboard UI initialized');
            return true;
            
        } catch (error) {
            errorHandler.handleUIError(error, {
                operation: 'initialize',
                context: 'KeyboardUI.initialize'
            });
            return false;
        }
    }

    /**
     * Create the virtual keyboard
     */
    createKeyboard() {
        this.keyboardContainer.innerHTML = '';
        
        const octaveKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
        
        // Create white keys first
        whiteKeys.forEach((note, index) => {
            const key = this.createKey(note, 'white', index);
            this.keyboardContainer.appendChild(key);
        });
        
        // Create black keys
        blackKeys.forEach((note) => {
            const key = this.createKey(note, 'black');
            this.keyboardContainer.appendChild(key);
            this.positionBlackKey(key, note);
        });
        
        this.updateKeyLabels();
    }

    /**
     * Create a single keyboard key
     * @param {string} note - Note name
     * @param {string} type - Key type (white/black)
     * @param {number} index - White key index
     * @returns {HTMLElement} Key element
     */
    createKey(note, type, index = 0) {
        const key = DOMUtils.createElement('div', {
            className: `key-${type}`,
            'data-note': note,
            'data-octave': this.currentOctave
        });

        // Position white keys
        if (type === 'white') {
            const keyWidth = 100 / 7; // 7 white keys per octave
            key.style.left = `${index * keyWidth}%`;
            key.style.width = `${keyWidth}%`;
        }

        // Add note label
        const label = DOMUtils.createElement('span', {
            className: 'key-label'
        }, note);
        key.appendChild(label);

        // Store key reference
        const noteId = this.getNoteId(note, this.currentOctave);
        this.keyMap.set(noteId, key);

        // Add event listeners
        this.setupKeyEventListeners(key, note);

        return key;
    }

    /**
     * Position black keys relative to white keys
     * @param {HTMLElement} key - Black key element
     * @param {string} note - Note name
     */
    positionBlackKey(key, note) {
        const blackKeyPositions = {
            'C#': 7.14,   // Between C and D
            'D#': 21.43,  // Between D and E
            'F#': 50,     // Between F and G
            'G#': 64.29,  // Between G and A
            'A#': 78.57   // Between A and B
        };

        const position = blackKeyPositions[note];
        if (position !== undefined) {
            key.style.left = `${position}%`;
            key.style.width = '7.14%'; // Slightly narrower than white keys
        }
    }

    /**
     * Setup event listeners for a key
     * @param {HTMLElement} key - Key element
     * @param {string} note - Note name
     */
    setupKeyEventListeners(key, note) {
        // Mouse events
        key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleKeyPress(note, 0.8); // Default velocity
        });

        key.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.handleKeyRelease(note);
        });

        key.addEventListener('mouseleave', (e) => {
            this.handleKeyRelease(note);
        });

        // Touch events for mobile
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleKeyPress(note, 0.8);
        });

        key.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleKeyRelease(note);
        });

        key.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.handleKeyRelease(note);
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Computer keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Ignore key repeat
            this.handleComputerKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.handleComputerKeyUp(e);
        });

        // Octave controls
        const octaveUpButton = document.getElementById('octave-up');
        const octaveDownButton = document.getElementById('octave-down');

        if (octaveUpButton) {
            octaveUpButton.addEventListener('click', () => {
                this.changeOctave(1);
            });
        }

        if (octaveDownButton) {
            octaveDownButton.addEventListener('click', () => {
                this.changeOctave(-1);
            });
        }

        // Listen for state changes
        stateManager.subscribe('keyboard.octave', (octave) => {
            if (octave !== this.currentOctave) {
                this.setOctave(octave);
            }
        });

        // Listen for UI refresh events
        eventBus.on('ui:refresh-keyboard', () => {
            this.refreshKeyboard();
        });

        // Listen for note events from other sources
        eventBus.on(EVENTS.NOTE_ON, (data) => {
            this.highlightKey(data.note, true);
        });

        eventBus.on(EVENTS.NOTE_OFF, (data) => {
            this.highlightKey(data.note, false);
        });
    }

    /**
     * Handle computer keyboard key down
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleComputerKeyDown(e) {
        // Ignore if modifier keys are pressed or if typing in input
        if (e.ctrlKey || e.metaKey || e.altKey || this.isTypingInInput(e.target)) {
            return;
        }

        const note = this.computerKeyMap.get(e.code);
        if (note && !this.activeKeys.has(e.code)) {
            this.activeKeys.add(e.code);
            this.handleKeyPress(note, 0.8);
            e.preventDefault();
        }
    }

    /**
     * Handle computer keyboard key up
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleComputerKeyUp(e) {
        const note = this.computerKeyMap.get(e.code);
        if (note && this.activeKeys.has(e.code)) {
            this.activeKeys.delete(e.code);
            this.handleKeyRelease(note);
            e.preventDefault();
        }
    }

    /**
     * Check if user is typing in an input field
     * @param {Element} target - Event target
     * @returns {boolean} Is typing in input
     */
    isTypingInInput(target) {
        const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTypes.includes(target.tagName) || target.contentEditable === 'true';
    }

    /**
     * Handle key press
     * @param {string} note - Note name
     * @param {number} velocity - Note velocity (0-1)
     */
    handleKeyPress(note, velocity) {
        const noteId = this.getNoteId(note, this.currentOctave);
        
        // Highlight key visually
        this.highlightKey(noteId, true);
        
        // Emit note on event
        eventBus.emit(EVENTS.NOTE_ON, {
            note: noteId,
            velocity: velocity,
            source: 'keyboard'
        });

        errorHandler.debug(`Key pressed: ${noteId}, velocity: ${velocity}`);
    }

    /**
     * Handle key release
     * @param {string} note - Note name
     */
    handleKeyRelease(note) {
        const noteId = this.getNoteId(note, this.currentOctave);
        
        // Remove key highlight
        this.highlightKey(noteId, false);
        
        // Emit note off event
        eventBus.emit(EVENTS.NOTE_OFF, {
            note: noteId,
            source: 'keyboard'
        });

        errorHandler.debug(`Key released: ${noteId}`);
    }

    /**
     * Highlight or unhighlight a key
     * @param {string} noteId - Note ID (e.g., 'C4')
     * @param {boolean} active - Whether to highlight
     */
    highlightKey(noteId, active) {
        const key = this.keyMap.get(noteId);
        if (key) {
            if (active) {
                key.classList.add('active');
            } else {
                key.classList.remove('active');
            }
        }
    }

    /**
     * Change octave by offset
     * @param {number} offset - Octave offset (-1 or 1)
     */
    changeOctave(offset) {
        const newOctave = Math.max(0, Math.min(8, this.currentOctave + offset));
        this.setOctave(newOctave);
    }

    /**
     * Set current octave
     * @param {number} octave - Octave number (0-8)
     */
    setOctave(octave) {
        if (octave === this.currentOctave) return;
        
        this.currentOctave = octave;
        stateManager.setState('keyboard.octave', octave);
        
        // Update octave display
        const octaveDisplay = document.getElementById('octave-display');
        if (octaveDisplay) {
            octaveDisplay.textContent = `Octave: ${octave}`;
        }
        
        // Update key data attributes and map
        this.updateKeyOctaves();
        
        errorHandler.debug(`Octave changed to: ${octave}`);
    }

    /**
     * Update key octave data and map
     */
    updateKeyOctaves() {
        this.keyMap.clear();
        
        const keys = this.keyboardContainer.querySelectorAll('.key-white, .key-black');
        keys.forEach(key => {
            const note = key.dataset.note;
            key.dataset.octave = this.currentOctave;
            
            const noteId = this.getNoteId(note, this.currentOctave);
            this.keyMap.set(noteId, key);
        });
    }

    /**
     * Update key labels with computer keyboard mappings
     */
    updateKeyLabels() {
        for (const [keyCode, note] of this.computerKeyMap) {
            const noteId = this.getNoteId(note, this.currentOctave);
            const key = this.keyMap.get(noteId);
            
            if (key) {
                const label = key.querySelector('.key-label');
                if (label) {
                    const keyName = keyCode.replace('Key', '');
                    label.textContent = `${note}\n${keyName}`;
                }
            }
        }
    }

    /**
     * Get note ID from note name and octave
     * @param {string} note - Note name
     * @param {number} octave - Octave number
     * @returns {string} Note ID
     */
    getNoteId(note, octave) {
        return `${note}${octave}`;
    }

    /**
     * Refresh keyboard display
     */
    refreshKeyboard() {
        if (!this.isInitialized) return;
        
        this.createKeyboard();
        this.updateKeyLabels();
    }

    /**
     * Load keyboard state from state manager
     */
    loadKeyboardState() {
        const octave = stateManager.getStateValue('keyboard.octave');
        if (octave !== undefined && octave !== this.currentOctave) {
            this.setOctave(octave);
        }
    }

    /**
     * Get current keyboard state
     * @returns {Object} Keyboard state
     */
    getKeyboardState() {
        return {
            currentOctave: this.currentOctave,
            activeKeys: Array.from(this.activeKeys),
            isInitialized: this.isInitialized
        };
    }

    /**
     * Cleanup keyboard UI
     */
    cleanup() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleComputerKeyDown);
        document.removeEventListener('keyup', this.handleComputerKeyUp);
        
        // Clear active keys
        this.activeKeys.clear();
        this.keyMap.clear();
        
        // Clear keyboard container
        if (this.keyboardContainer) {
            this.keyboardContainer.innerHTML = '';
        }
        
        this.isInitialized = false;
        errorHandler.info('Keyboard UI cleaned up');
    }
}

