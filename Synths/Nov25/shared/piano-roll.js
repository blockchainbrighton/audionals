export class PianoRoll {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            width: 800,
            height: 200,
            keyHeight: 10,
            beatWidth: 40,
            octaves: 4,
            startOctave: 2,
            ...options
        };
        
        this.notes = []; // { note: 60, start: 0, duration: 1, velocity: 1 }
        this.cursor = 0;
        this.isPlaying = false;
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.bindEvents();
    }

    resize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    setNotes(notes) {
        this.notes = notes;
        this.draw();
    }

    setCursor(beat) {
        this.cursor = beat;
        this.draw();
    }

    bindEvents() {
        let isDragging = false;
        let startX, startY;

        this.canvas.addEventListener('mousedown', e => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Convert to Beat/Pitch
            const beat = (x + this.scrollX) / this.options.beatWidth;
            const pitchIndex = Math.floor(y / this.options.keyHeight);
            const midi = (this.options.startOctave * 12 + (this.options.octaves * 12)) - pitchIndex - 1; // Invert Y

            // Simple Toggle Note for now
            this.toggleNoteAt(midi, Math.floor(beat));
        });
    }

    toggleNoteAt(midi, quantBeat) {
        const existing = this.notes.findIndex(n => n.note === midi && Math.floor(n.start) === quantBeat);
        if (existing > -1) {
            this.notes.splice(existing, 1);
        } else {
            this.notes.push({ note: midi, start: quantBeat, duration: 1, velocity: 0.8 });
        }
        this.draw();
        if (this.options.onNoteChange) this.options.onNoteChange(this.notes);
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        const opts = this.options;

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.lineWidth = 1;
        // Horizontal (Keys)
        const totalKeys = opts.octaves * 12;
        for (let i = 0; i < totalKeys; i++) {
            const y = i * opts.keyHeight;
            const noteInOctave = (totalKeys - 1 - i) % 12;
            const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave); // C# D# F# G# A#
            
            ctx.fillStyle = isBlack ? '#222' : '#2a2a2a';
            ctx.fillRect(0, y, w, opts.keyHeight);
            
            ctx.strokeStyle = '#333';
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Vertical (Beats)
        const beats = Math.ceil(w / opts.beatWidth);
        for (let i = 0; i < beats; i++) {
            const x = i * opts.beatWidth;
            ctx.strokeStyle = i % 4 === 0 ? '#555' : '#333';
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }

        // Notes
        ctx.fillStyle = '#ff9800';
        this.notes.forEach(n => {
            // Y Position
            // MIDI 60 (C4) -> Index relative to top
            const totalMidiStart = opts.startOctave * 12;
            const totalMidiEnd = totalMidiStart + totalKeys;
            
            if (n.note >= totalMidiStart && n.note < totalMidiEnd) {
                const keyIndex = totalMidiEnd - 1 - n.note;
                const y = keyIndex * opts.keyHeight;
                const x = n.start * opts.beatWidth;
                const wid = n.duration * opts.beatWidth;
                
                ctx.fillRect(x + 1, y + 1, wid - 2, opts.keyHeight - 2);
            }
        });

        // Playhead
        const cx = this.cursor * opts.beatWidth;
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    }
}
