/**
 * @file PianoRoll.js
 * @description Piano roll UI component for the BOP Synthesizer.
 * Refactored to accept a container element and use event-driven communication.
 */

export class PianoRoll {
    rollGrid; eventBus; state;
    scrollContainer = null; innerContent = null;
    MIDI_LOW = 21; MIDI_HIGH = 108; CELL_H = 18;
    zoomX = 1; zoomY = 1; minZoomX = 0.25; maxZoomX = 4; minZoomY = 0.5; maxZoomY = 2.5;
    transportInterval = null; dragData = null; dragNoteIndex = null; lastPreviewMidi = null; _keyListener = null;
    quantizeEnabled = false; quantizeGrid = 0.25; Tone = null;

    constructor(containerElement, eventBus, state) {
        this.rollGrid = containerElement;
        this.eventBus = eventBus;
        this.state = state;
        if (!this.rollGrid) { console.warn('[PianoRoll] Cannot initialize; no container.'); return; }
        this.init();
    }

    init() { this.#createUI(); this.#setupEventListeners(); this.draw(); }

    #createUI() {
        this.rollGrid.innerHTML = '';
        Object.assign(this.rollGrid.style, {
            position: 'relative', background: '#181a1b', width: '100%', height: '60vh',
            display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px', userSelect: 'none', overflow: 'hidden'
        });
        // Controls Bar
        const bar = this.#div({
            display: 'flex', gap: '10px', alignItems: 'center', background: '#212126',
            borderBottom: '2px solid #29292d', padding: '7px 10px', position: 'sticky',
            top: 0, zIndex: 30, minHeight: '32px'
        });
        bar.append(
            this.#label('Zoom X:'), this.#btn('-', () => this.setZoomX(this.zoomX / 1.3)), this.#btn('+', () => this.setZoomX(this.zoomX * 1.3)),
            this.#label('Zoom Y:'), this.#btn('–', () => this.setZoomY(this.zoomY / 1.15)), this.#btn('∣∣', () => this.setZoomY(this.zoomY * 1.15))
        );
        this.rollGrid.appendChild(bar);
        // Scrollable Container
        this.scrollContainer = this.#div({
            display: 'flex', flexGrow: 1, overflowX: 'auto', overflowY: 'auto',
            minWidth: 0, minHeight: 0, position: 'relative', background: 'transparent'
        });
        this.rollGrid.appendChild(this.scrollContainer);
        // Main Content Area
        this.innerContent = this.#div({
            display: 'flex', flexDirection: 'column', width: '100%',
            minHeight: '100%', position: 'relative'
        });
        this.scrollContainer.appendChild(this.innerContent);
    }

    #setupEventListeners() {
        // Redraws
        ['pianoroll-redraw', 'sequence-changed'].forEach(type =>
            this.eventBus.addEventListener(type, () => this.draw())
        );
        // Note selection
        this.eventBus.addEventListener('note-selected', e => { this.state.selNote = e.detail.noteIndex; this.draw(); });
        // Quantization
        this.eventBus.addEventListener('quantization-changed', e => {
            ({ enabled: this.quantizeEnabled, gridValue: this.quantizeGrid } = e.detail);
            this.draw();
        });
        // Playback animation
        this.eventBus.addEventListener('recording-state-changed', e => e.detail.isPlaying ? this.startPlayheadAnimation() : this.stopPlayheadAnimation());
        // Tone.js ready
        this.eventBus.addEventListener('tone-ready', e => { this.Tone = e.detail.Tone; this.draw(); });
        // Keyboard shortcut (note delete)
        if (!this._keyListener) {
            this._keyListener = e => {
                if ((e.key === "Delete" || e.key === "Backspace") && typeof this.state.selNote === "number" && this.state.selNote >= 0) {
                    this.eventBus.dispatchEvent(new CustomEvent('note-delete', { detail: { noteIndex: this.state.selNote } }));
                    this.state.seq.splice(this.state.selNote, 1); this.state.selNote = null; this.draw();
                    this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }
    }

    draw() {
        if (!this.innerContent) return;
        const Tone = this.Tone || window.Tone; if (!Tone) { console.warn('[PianoRoll] No Tone.js.'); return; }
        const seq = this.state.seq || [], quantGrid = this.quantizeEnabled ? this.quantizeGrid : null;
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const gridTimeCount = quantGrid ? Math.ceil(timeMax / quantGrid) * quantGrid : Math.ceil(timeMax / 0.25) * 0.25;
        const cellW = 40 * this.zoomX, cellH = this.CELL_H * this.zoomY;
        this.innerContent.innerHTML = '';
        const gridWidth = cellW * gridTimeCount;
        for (let midi = this.MIDI_HIGH; midi >= this.MIDI_LOW; midi--) {
            const rowDiv = this.#div({ display: 'flex', height: cellH + 'px', minHeight: cellH + 'px', position: 'relative' });
            const noteName = Tone.Frequency(midi, "midi").toNote();
            // Row Label
            const labelCell = this.#div({
                width: '48px', minWidth: '48px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '8px', fontWeight: (midi % 12 === 0) ? 'bold' : 'normal', color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: this.#isBlackKey(midi) ? '#18181c' : '#232323', borderBottom: '1px solid #23232a', fontSize: '13px',
                userSelect: 'none', zIndex: 2, borderRight: '2px solid #282828'
            }, noteName);
            // Grid Area
            const gridCell = this.#div({ position: 'relative', flexGrow: 1, height: '100%', minHeight: '100%', background: 'transparent' });
            this.#drawGridLines(gridCell, midi, gridTimeCount, quantGrid, cellW);
            this.#drawNotesInRow(gridCell, midi, seq, cellW, Tone);
            rowDiv.append(labelCell, gridCell); this.innerContent.appendChild(rowDiv);
        }
        this.innerContent.style.width = `calc(48px + ${gridWidth}px)`;
        this.#setupDragListeners(cellW, Tone);
        this.updatePlayhead(cellW);
        // Deselect on empty click
        this.innerContent.onclick = e => {
            if (e.target.classList.contains('roll-note') || e.target.closest('.roll-note')) return;
            this.state.selNote = null;
            this.innerContent.querySelectorAll('.roll-note').forEach(el => el.style.outline = 'none');
            this.eventBus.dispatchEvent(new CustomEvent('note-deselected'));
        };
    }

    #drawGridLines(gridCell, midi, gridTimeCount, quantGrid, cellW) {
        // Horizontal
        gridCell.appendChild(this.#div({
            position: 'absolute', left: 0, right: 0, top: 0, height: '1px',
            background: (midi % 12 === 0) ? '#444' : '#292b2e',
            opacity: (midi % 12 === 0) ? 0.55 : 0.22, pointerEvents: 'none', zIndex: 1
        }));
        // Black key
        if (this.#isBlackKey(midi)) gridCell.appendChild(this.#div({
            position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
            background: '#1c1c22', opacity: 0.46, zIndex: 0, pointerEvents: 'none'
        }));
        // Vertical (top row only)
        if (quantGrid && midi === this.MIDI_HIGH) {
            for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                const isBar = (Math.round(t / 4) * 4 === t);
                gridCell.appendChild(this.#div({
                    position: 'absolute', top: 0, bottom: `-${(this.MIDI_HIGH - this.MIDI_LOW) * this.CELL_H * this.zoomY}px`,
                    left: (t * cellW) + 'px', width: isBar ? '2px' : '1px',
                    background: isBar ? '#444' : '#292b2e', opacity: isBar ? 0.6 : 0.22,
                    pointerEvents: 'none', zIndex: 1
                }));
            }
        }
    }

    #drawNotesInRow(gridCell, midi, seq, cellW, Tone) {
        seq.forEach((noteObj, i) => {
            if (Tone.Frequency(noteObj.note).toMidi() !== midi) return;
            const x = noteObj.start * cellW, w = noteObj.dur * cellW;
            const noteDiv = this.#div({
                position: 'absolute', left: `${x}px`, width: `${w}px`, height: '100%',
                background: '#bb86fc', borderRadius: '4px', boxShadow: '0 2px 8px #0004',
                opacity: noteObj.vel, zIndex: 10, cursor: 'grab',
                outline: this.state.selNote === i ? '2px solid #03dac6' : 'none'
            });
            noteDiv.className = 'roll-note'; noteDiv.dataset.idx = i;
            noteDiv.onclick = evt => {
                evt.stopPropagation(); this.state.selNote = i;
                this.eventBus.dispatchEvent(new CustomEvent('note-selected', { detail: { noteIndex: i, note: noteObj } }));
                this.eventBus.dispatchEvent(new CustomEvent('note-preview', { detail: { note: noteObj.note, duration: 0.3, velocity: 0.9 } }));
                this.draw();
            };
            noteDiv.onmousedown = e => {
                if (e.button !== 0) return;
                e.stopPropagation();
                this.dragData = { startX: e.clientX, startY: e.clientY, origStart: noteObj.start, origMidi: midi };
                this.dragNoteIndex = i; this.lastPreviewMidi = midi; document.body.style.cursor = 'move';
            };
            gridCell.appendChild(noteDiv);
        });
    }

    #setupDragListeners(cellW, Tone) {
        const onMove = e => {
            if (!this.dragData || this.dragNoteIndex === null) return;
            const note = this.state.seq[this.dragNoteIndex];
            const dx = e.clientX - this.dragData.startX, dy = e.clientY - this.dragData.startY, dt = dx / cellW;
            const currentQuant = this.quantizeEnabled ? this.quantizeGrid : null;
            const newStart = this.dragData.origStart + dt;
            note.start = Math.max(0, currentQuant ? Math.round(newStart / currentQuant) * currentQuant : newStart);
            const dpitch = -Math.round(dy / (this.CELL_H * this.zoomY));
            const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, this.dragData.origMidi + dpitch));
            note.note = Tone.Frequency(newMidi, "midi").toNote();
            if (this.lastPreviewMidi !== newMidi) {
                this.eventBus.dispatchEvent(new CustomEvent('note-preview', { detail: { note: note.note, duration: 0.3, velocity: 0.9 } }));
                this.lastPreviewMidi = newMidi;
            }
            this.draw();
        };
        const onUp = () => {
            if (this.dragNoteIndex !== null) {
                this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                    detail: { noteIndex: this.dragNoteIndex, note: this.state.seq[this.dragNoteIndex] }
                }));
                this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
            }
            this.dragData = null; this.dragNoteIndex = null; document.body.style.cursor = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp, { once: true });
    }

    startPlayheadAnimation() {
        if (!this.transportInterval)
            this.transportInterval = setInterval(() => this.updatePlayhead(40 * this.zoomX), 33);
    }
    stopPlayheadAnimation() {
        if (this.transportInterval) clearInterval(this.transportInterval), this.transportInterval = null;
        const oldPh = this.scrollContainer?.querySelector('.playhead'); if (oldPh) oldPh.remove();
    }
    updatePlayhead(cellW) {
        if (!this.innerContent || !this.scrollContainer) return;
        const Tone = this.Tone || window.Tone; if (!Tone) return;
        const playTime = Tone.Transport.seconds;
        if (!this.state.isPlaying) { this.stopPlayheadAnimation(); return; }
        let ph = this.scrollContainer.querySelector('.playhead');
        if (!ph) {
            ph = this.#div({
                position: 'absolute', top: 0, width: '3px', background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                opacity: 0.9, zIndex: 99, pointerEvents: 'none'
            });
            ph.className = 'playhead';
            this.scrollContainer.appendChild(ph);
        }
        ph.style.left = `${playTime * cellW + 48}px`;
        ph.style.height = `${this.innerContent.scrollHeight}px`;
    }

    // --- Utility ---
    #div(style, text) { const d = document.createElement('div'); Object.assign(d.style, style); if (text) d.textContent = text; return d; }
    #btn(txt, cb) { const b = document.createElement('button'); b.textContent = txt;
        Object.assign(b.style, { background: '#272733', color: '#fff', border: '1px solid #363645', borderRadius: '5px', padding: '3px 10px', margin: '0 2px', cursor: 'pointer', fontSize: '13px' });
        b.onclick = cb; return b;
    }
    #label(txt) { const s = document.createElement('span'); s.textContent = txt; Object.assign(s.style, { margin: '0 4px', color: '#aaa', fontSize: '13px' }); return s; }
    #isBlackKey(midi) { return [1, 3, 6, 8, 10].includes(midi % 12); }
    setZoomX(val) { this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val)); this.draw(); }
    setZoomY(val) { this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val)); this.draw(); }

    destroy() {
        this.stopPlayheadAnimation();
        if (this._keyListener) { document.removeEventListener("keydown", this._keyListener); this._keyListener = null; }
        if (this.rollGrid) this.rollGrid.innerHTML = '';
    }
}

export default PianoRoll;
