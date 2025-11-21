/**
 * Keyboard.js
 * Virtual piano keyboard with mouse and computer keyboard support
 */

export class Keyboard {
  constructor(container, onNoteOn, onNoteOff) {
    this.container = container;
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.activeNotes = new Set();
    this.mouseDown = false;
    
    // Keyboard layout: 2 octaves starting from C4 (MIDI 60)
    this.startNote = 60; // C4
    this.numOctaves = 2;
    
    // Computer keyboard mapping (QWERTY)
    this.keyMap = {
      'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71,
      'k': 72, 'o': 73, 'l': 74, 'p': 75, ';': 76, '\'': 77, ']': 78
    };
    
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard';
    
    const whiteKeys = [];
    const blackKeys = [];
    
    // Generate keys for specified octaves
    for (let octave = 0; octave < this.numOctaves; octave++) {
      const octaveStart = this.startNote + (octave * 12);
      
      // White keys: C, D, E, F, G, A, B
      const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
      whiteNotes.forEach((offset, index) => {
        const note = octaveStart + offset;
        const key = this.createKey(note, 'white');
        whiteKeys.push(key);
      });
      
      // Black keys: C#, D#, F#, G#, A#
      const blackNotes = [1, 3, 6, 8, 10];
      const blackPositions = [0, 1, 3, 4, 5]; // Position relative to white keys
      blackNotes.forEach((offset, index) => {
        const note = octaveStart + offset;
        const key = this.createKey(note, 'black');
        const whiteKeyIndex = (octave * 7) + blackPositions[index];
        key.style.left = `${(whiteKeyIndex + 1) * 40}px`;
        blackKeys.push(key);
      });
    }
    
    // Append white keys first, then black keys (for z-index layering)
    whiteKeys.forEach(key => keyboard.appendChild(key));
    blackKeys.forEach(key => keyboard.appendChild(key));
    
    this.container.appendChild(keyboard);
  }
  
  createKey(note, type) {
    const key = document.createElement('div');
    key.className = `key ${type}`;
    key.dataset.note = note;
    
    // Add note label
    const label = document.createElement('span');
    label.className = 'key-label';
    label.textContent = this.getNoteLabel(note);
    key.appendChild(label);
    
    // Mouse events
    key.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.mouseDown = true;
      this.noteOn(note);
    });
    
    key.addEventListener('mouseenter', (e) => {
      if (this.mouseDown) {
        this.noteOn(note);
      }
    });
    
    key.addEventListener('mouseleave', (e) => {
      if (this.activeNotes.has(note)) {
        this.noteOff(note);
      }
    });
    
    key.addEventListener('mouseup', (e) => {
      this.noteOff(note);
    });
    
    // Touch events
    key.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.noteOn(note);
    });
    
    key.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.noteOff(note);
    });
    
    return key;
  }
  
  attachEventListeners() {
    // Global mouse up to stop all notes
    document.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this.stopAllNotes();
    });
    
    // Computer keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      
      const key = e.key.toLowerCase();
      if (this.keyMap[key] !== undefined) {
        e.preventDefault();
        this.noteOn(this.keyMap[key]);
      }
    });
    
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (this.keyMap[key] !== undefined) {
        e.preventDefault();
        this.noteOff(this.keyMap[key]);
      }
    });
  }
  
  noteOn(note, velocity = 0.8) {
    if (this.activeNotes.has(note)) return;
    
    this.activeNotes.add(note);
    
    // Visual feedback
    const keyElement = this.container.querySelector(`[data-note="${note}"]`);
    if (keyElement) {
      keyElement.classList.add('active');
    }
    
    // Trigger callback
    if (this.onNoteOn) {
      this.onNoteOn(note, velocity);
    }
  }
  
  noteOff(note) {
    if (!this.activeNotes.has(note)) return;
    
    this.activeNotes.delete(note);
    
    // Visual feedback
    const keyElement = this.container.querySelector(`[data-note="${note}"]`);
    if (keyElement) {
      keyElement.classList.remove('active');
    }
    
    // Trigger callback
    if (this.onNoteOff) {
      this.onNoteOff(note);
    }
  }
  
  stopAllNotes() {
    const notes = Array.from(this.activeNotes);
    notes.forEach(note => this.noteOff(note));
  }
  
  getNoteLabel(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }
  
  destroy() {
    this.stopAllNotes();
    this.container.innerHTML = '';
  }
}
