export class KeyboardUI {
  constructor(containerId, engine) {
    this.container = document.getElementById(containerId);
    this.engine = engine;
    this.downKeys = new Set();
    this.buildKeyboard();
    this.bindKeyboardEvents();
  }

  buildKeyboard() {
    const row = document.createElement('div');
    row.className = 'kb-row';
    this.container.appendChild(row);

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let oct = 1;
    let idx = 0;

    for (let i = 0; i < 88; i++) {
      const name = notes[idx];
      const fullName = `${name}${oct}`;
      const key = document.createElement('div');
      key.dataset.note = fullName;
      key.className = name.includes('#') ? 'key black' : 'key white';
      row.appendChild(key);

      idx++;
      if (idx >= notes.length) {
        idx = 0;
        oct++;
      }
    }
  }

  play(element) {
    if (!element || element.classList.contains('active')) return;
    this.engine.playNote(element.dataset.note);
    element.classList.add('active');
  }

  stop(element) {
    if (!element) return;
    this.engine.stopNote(element.dataset.note);
    element.classList.remove('active');
  }

  bindKeyboardEvents() {
    this.container.querySelectorAll('.key').forEach(key => {
      key.addEventListener('mousedown', () => this.play(key));
      key.addEventListener('mouseup', () => this.stop(key));
      key.addEventListener('mouseleave', () => this.stop(key));
      key.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.play(key);
      });
      key.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.stop(key);
      });
    });

    const keyMap = {
      'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4', 't': 'F#4', 'g': 'G4',
      'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5',
      ';': 'E5'
    };

    window.addEventListener('keydown', e => {
      if (this.downKeys.has(e.key)) return;
      const note = keyMap[e.key];
      if (!note) return;
      const keyElement = this.container.querySelector(`[data-note="${note}"]`);
      if (!keyElement) return;
      this.downKeys.add(e.key);
      this.play(keyElement);
    });

    window.addEventListener('keyup', e => {
      const note = keyMap[e.key];
      if (!note) return;
      this.downKeys.delete(e.key);
      const keyElement = this.container.querySelector(`[data-note="${note}"]`);
      if (!keyElement) return;
      this.stop(keyElement);
    });
  }
}