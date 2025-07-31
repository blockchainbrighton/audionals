/**
 * @file PianoRoll.js
 * @description Piano roll UI component for the BOP Synthesizer.
 * Refactored for performance with state-driven, incremental update rendering.
 */

export class PianoRoll {
    rollGrid; eventBus; state;
    scrollContainer = null; innerContent = null;
    MIDI_LOW = 21; MIDI_HIGH = 108; CELL_H = 18;
    zoomX = 1; zoomY = 1; minZoomX = 0.25; maxZoomX = 4; minZoomY = 0.5; maxZoomY = 2.5;
    transportInterval = null; dragData = null; dragNoteIndex = null; lastPreviewMidi = null; _keyListener = null;
    quantizeEnabled = false; quantizeGrid = 0.25; Tone = null;

    // New caching and state management properties
    noteElementMap = new Map();     // Cache for note DOM elements (noteId -> element)
    rowElements = new Map();        // Cache for row references (midi -> rowElement)
    noteContainer = null;           // Dedicated container for all note elements
    gridOverlay = null;             // Dedicated element for CSS grid background
    isDrawn = false;                // Flag to prevent re-running initial setup
    lastGridState = null;           // Cache for grid rendering state

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

    getUIState() {
        return {
            zoomX: this.zoomX,
            zoomY: this.zoomY,
            scrollX: this.scrollContainer ? this.scrollContainer.scrollLeft : 0,
            scrollY: this.scrollContainer ? this.scrollContainer.scrollTop : 0
        };
    }

    applyUIState(state) {
        if (!state) return;
        if (typeof state.zoomX === 'number') this.setZoomX(state.zoomX);
        if (typeof state.zoomY === 'number') this.setZoomY(state.zoomY);
        if (this.scrollContainer) {
            if (typeof state.scrollX === 'number') this.scrollContainer.scrollLeft = state.scrollX;
            if (typeof state.scrollY === 'number') this.scrollContainer.scrollTop = state.scrollY;
        }
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

    // NEW: Main orchestrator draw method
    draw() {
        if (!this.innerContent) return;
        const Tone = this.Tone || window.Tone; 
        if (!Tone) { console.warn('[PianoRoll] No Tone.js.'); return; }

        // Initialize persistent structure if not done
        if (!this.isDrawn) {
            this.#initialDraw(Tone);
        }

        // Update grid if zoom or quantization changed
        this.#updateGridLines();

        // Sync notes with current state
        this.#syncStateToView(Tone);

        // Update playhead
        this.updatePlayhead(40 * this.zoomX);
    }

    // NEW: Initial draw - creates persistent DOM structure
    #initialDraw(Tone) {
        this.innerContent.innerHTML = '';
        this.noteElementMap.clear();
        this.rowElements.clear();

        // Create grid overlay for CSS-based grid lines
        this.gridOverlay = this.#div({
            position: 'absolute',
            top: 0,
            left: '48px',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
        });

        // Create rows structure
        for (let midi = this.MIDI_HIGH; midi >= this.MIDI_LOW; midi--) {
            const cellH = this.CELL_H * this.zoomY;
            const rowDiv = this.#div({ 
                display: 'flex', 
                height: cellH + 'px', 
                minHeight: cellH + 'px', 
                position: 'relative' 
            });
            
            const noteName = Tone.Frequency(midi, "midi").toNote();
            
            // Row Label
            const labelCell = this.#div({
                width: '48px', minWidth: '48px', height: '100%', 
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '8px', 
                fontWeight: (midi % 12 === 0) ? 'bold' : 'normal', 
                color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: this.#isBlackKey(midi) ? '#18181c' : '#232323', 
                borderBottom: '1px solid #23232a', 
                fontSize: '13px',
                userSelect: 'none', 
                zIndex: 2, 
                borderRight: '2px solid #282828'
            }, noteName);

            // Grid Area - now just a container
            const gridCell = this.#div({ 
                position: 'relative', 
                flexGrow: 1, 
                height: '100%', 
                minHeight: '100%', 
                background: 'transparent' 
            });

            // Add black key overlay
            if (this.#isBlackKey(midi)) {
                gridCell.appendChild(this.#div({
                    position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                    background: '#1c1c22', opacity: 0.46, zIndex: 0, pointerEvents: 'none'
                }));
            }

            rowDiv.append(labelCell, gridCell);
            this.innerContent.appendChild(rowDiv);
            this.rowElements.set(midi, { rowDiv, gridCell });
        }

        // Create dedicated note container
        this.noteContainer = this.#div({
            position: 'absolute',
            top: 0,
            left: '48px',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10
        });

        this.innerContent.appendChild(this.gridOverlay);
        this.innerContent.appendChild(this.noteContainer);

        // Setup click handler for deselection
        this.innerContent.onclick = e => {
            if (e.target.classList.contains('roll-note') || e.target.closest('.roll-note')) return;
            this.state.selNote = null;
            this.noteElementMap.forEach(noteEl => noteEl.style.outline = 'none');
            this.eventBus.dispatchEvent(new CustomEvent('note-deselected'));
        };

        this.isDrawn = true;
    }

    // NEW: Render a single note element
    #renderNote(note, noteIndex, Tone) {
        const cellW = 40 * this.zoomX;
        const cellH = this.CELL_H * this.zoomY;
        const midi = Tone.Frequency(note.note).toMidi();
        
        const x = note.start * cellW;
        const w = note.dur * cellW;
        const y = (this.MIDI_HIGH - midi) * cellH;

        const noteDiv = this.#div({
            position: 'absolute', 
            left: `${x}px`, 
            top: `${y}px`,
            width: `${w}px`, 
            height: `${cellH}px`,
            background: '#bb86fc', 
            borderRadius: '4px', 
            boxShadow: '0 2px 8px #0004',
            opacity: note.vel, 
            zIndex: 10, 
            cursor: 'grab',
            pointerEvents: 'auto',
            outline: this.state.selNote === noteIndex ? '2px solid #03dac6' : 'none'
        });

        noteDiv.className = 'roll-note';
        noteDiv.dataset.idx = noteIndex;

        // Event listeners
        noteDiv.onclick = evt => {
            evt.stopPropagation();
            this.state.selNote = noteIndex;
            this.eventBus.dispatchEvent(new CustomEvent('note-selected', { 
                detail: { noteIndex, note } 
            }));
            this.eventBus.dispatchEvent(new CustomEvent('note-preview', { 
                detail: { note: note.note, duration: 0.3, velocity: 0.9 } 
            }));
            this.#updateNoteSelection();
        };

        noteDiv.onmousedown = e => {
            if (e.button !== 0) return;
            e.stopPropagation();
            this.dragData = { 
                startX: e.clientX, 
                startY: e.clientY, 
                origStart: note.start, 
                origMidi: midi 
            };
            this.dragNoteIndex = noteIndex;
            this.lastPreviewMidi = midi;
            document.body.style.cursor = 'move';
            this.#setupDragListeners(cellW, Tone);
        };

        this.noteContainer.appendChild(noteDiv);
        this.noteElementMap.set(this.#getNoteId(noteIndex, note), noteDiv);

        return noteDiv;
    }

    // NEW: Update existing note element
    #updateNoteView(note, noteIndex, Tone) {
        const noteId = this.#getNoteId(noteIndex, note);
        const noteEl = this.noteElementMap.get(noteId);
        if (!noteEl) return;

        const cellW = 40 * this.zoomX;
        const cellH = this.CELL_H * this.zoomY;
        const midi = Tone.Frequency(note.note).toMidi();
        
        const x = note.start * cellW;
        const w = note.dur * cellW;
        const y = (this.MIDI_HIGH - midi) * cellH;

        // Update position and size
        noteEl.style.left = `${x}px`;
        noteEl.style.top = `${y}px`;
        noteEl.style.width = `${w}px`;
        noteEl.style.height = `${cellH}px`;
        noteEl.style.opacity = note.vel;
        noteEl.style.outline = this.state.selNote === noteIndex ? '2px solid #03dac6' : 'none';
        noteEl.dataset.idx = noteIndex;
    }

    // NEW: Remove note element
    #removeNoteView(noteId) {
        const noteEl = this.noteElementMap.get(noteId);
        if (noteEl) {
            noteEl.remove();
            this.noteElementMap.delete(noteId);
        }
    }

    // NEW: Generate unique note ID - use note's ID if available, otherwise use index
    #getNoteId(noteIndex, note = null) {
        const noteObj = note || (this.state.seq && this.state.seq[noteIndex]);
        return noteObj && noteObj.id ? noteObj.id : `note_${noteIndex}`;
    }

    // NEW: Sync state to view (reconciliation)
    #syncStateToView(Tone) {
        const seq = this.state.seq || [];
        const currentNoteIds = new Set();

        // Process current notes in sequence
        seq.forEach((note, index) => {
            const noteId = this.#getNoteId(index, note);
            currentNoteIds.add(noteId);

            if (this.noteElementMap.has(noteId)) {
                // Update existing note
                this.#updateNoteView(note, index, Tone);
            } else {
                // Create new note
                this.#renderNote(note, index, Tone);
            }
        });

        // Remove notes that are no longer in the sequence
        for (const [noteId, noteEl] of this.noteElementMap) {
            if (!currentNoteIds.has(noteId)) {
                this.#removeNoteView(noteId);
            }
        }

        // Update container width
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const quantGrid = this.quantizeEnabled ? this.quantizeGrid : null;
        const gridTimeCount = quantGrid ? Math.ceil(timeMax / quantGrid) * quantGrid : Math.ceil(timeMax / 0.25) * 0.25;
        const gridWidth = 40 * this.zoomX * gridTimeCount;
        this.innerContent.style.width = `calc(48px + ${gridWidth}px)`;
    }

    // NEW: Update note selection highlighting
    #updateNoteSelection() {
        this.noteElementMap.forEach((noteEl, noteId) => {
            const noteIndex = parseInt(noteEl.dataset.idx);
            noteEl.style.outline = this.state.selNote === noteIndex ? '2px solid #03dac6' : 'none';
        });
    }

    // NEW: Performant grid rendering using CSS
    #updateGridLines() {
        if (!this.gridOverlay) return;

        const cellW = 40 * this.zoomX;
        const cellH = this.CELL_H * this.zoomY;
        const seq = this.state.seq || [];
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const quantGrid = this.quantizeEnabled ? this.quantizeGrid : null;
        const gridTimeCount = quantGrid ? Math.ceil(timeMax / quantGrid) * quantGrid : Math.ceil(timeMax / 0.25) * 0.25;

        // Create grid state for comparison
        const gridState = {
            cellW, cellH, gridTimeCount, quantGrid,
            zoomX: this.zoomX, zoomY: this.zoomY
        };

        // Only update if grid state changed
        if (this.lastGridState && 
            JSON.stringify(gridState) === JSON.stringify(this.lastGridState)) {
            return;
        }

        const totalHeight = (this.MIDI_HIGH - this.MIDI_LOW + 1) * cellH;
        const totalWidth = gridTimeCount * cellW;

        // Horizontal lines (for each MIDI note)
        const horizontalLines = [];
        for (let midi = this.MIDI_LOW; midi <= this.MIDI_HIGH; midi++) {
            const isOctave = (midi % 12 === 0);
            const color = isOctave ? '#444' : '#292b2e';
            const opacity = isOctave ? 0.55 : 0.22;
            horizontalLines.push(`transparent ${(this.MIDI_HIGH - midi) * cellH}px`);
            horizontalLines.push(`${color} ${(this.MIDI_HIGH - midi) * cellH}px`);
            horizontalLines.push(`${color} ${(this.MIDI_HIGH - midi + 1) * cellH - 1}px`);
            horizontalLines.push(`transparent ${(this.MIDI_HIGH - midi + 1) * cellH - 1}px`);
        }

        // Vertical lines (for time grid)
        const verticalLines = [];
        if (quantGrid) {
            for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                const isBar = (Math.round(t / 4) * 4 === t);
                const color = isBar ? '#444' : '#292b2e';
                const width = isBar ? 2 : 1;
                verticalLines.push(`transparent ${t * cellW}px`);
                verticalLines.push(`${color} ${t * cellW}px`);
                verticalLines.push(`${color} ${t * cellW + width}px`);
                verticalLines.push(`transparent ${t * cellW + width}px`);
            }
        }

        // Apply CSS background
        const backgroundImages = [];
        if (horizontalLines.length > 0) {
            backgroundImages.push(`linear-gradient(to bottom, ${horizontalLines.join(', ')})`);
        }
        if (verticalLines.length > 0) {
            backgroundImages.push(`linear-gradient(to right, ${verticalLines.join(', ')})`);
        }

        this.gridOverlay.style.backgroundImage = backgroundImages.join(', ');
        this.gridOverlay.style.width = `${totalWidth}px`;
        this.gridOverlay.style.height = `${totalHeight}px`;

        this.lastGridState = gridState;
    }

    #setupDragListeners(cellW, Tone) {
        const onMove = e => {
            if (!this.dragData || this.dragNoteIndex === null) return;
            const note = this.state.seq[this.dragNoteIndex];
            const dx = e.clientX - this.dragData.startX;
            const dy = e.clientY - this.dragData.startY;
            const dt = dx / cellW;
            const currentQuant = this.quantizeEnabled ? this.quantizeGrid : null;
            const newStart = this.dragData.origStart + dt;
            note.start = Math.max(0, currentQuant ? Math.round(newStart / currentQuant) * currentQuant : newStart);
            const dpitch = -Math.round(dy / (this.CELL_H * this.zoomY));
            const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, this.dragData.origMidi + dpitch));
            note.note = Tone.Frequency(newMidi, "midi").toNote();
            if (this.lastPreviewMidi !== newMidi) {
                this.eventBus.dispatchEvent(new CustomEvent('note-preview', { 
                    detail: { note: note.note, duration: 0.3, velocity: 0.9 } 
                }));
                this.lastPreviewMidi = newMidi;
            }
            this.#updateNoteView(note, this.dragNoteIndex, Tone);
        };

        const onUp = () => {
            if (this.dragNoteIndex !== null) {
                this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                    detail: { noteIndex: this.dragNoteIndex, note: this.state.seq[this.dragNoteIndex] }
                }));
                this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
            }
            this.dragData = null;
            this.dragNoteIndex = null;
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
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
        const oldPh = this.scrollContainer?.querySelector('.playhead'); 
        if (oldPh) oldPh.remove();
    }

    updatePlayhead(cellW) {
        if (!this.innerContent || !this.scrollContainer) return;
        const Tone = this.Tone || window.Tone; 
        if (!Tone) return;
        const playTime = Tone.Transport.seconds;
        if (!this.state.isPlaying) { this.stopPlayheadAnimation(); return; }
        
        let ph = this.scrollContainer.querySelector('.playhead');
        if (!ph) {
            ph = this.#div({
                position: 'absolute', top: 0, width: '3px', 
                background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                opacity: 0.9, zIndex: 99, pointerEvents: 'none'
            });
            ph.className = 'playhead';
            this.scrollContainer.appendChild(ph);
        }
        ph.style.left = `${playTime * cellW + 48}px`;
        ph.style.height = `${this.innerContent.scrollHeight}px`;
    }

    // --- Utility ---
    #div(style, text) { 
        const d = document.createElement('div'); 
        Object.assign(d.style, style); 
        if (text) d.textContent = text; 
        return d; 
    }

    #btn(txt, cb) { 
        const b = document.createElement('button'); 
        b.textContent = txt;
        Object.assign(b.style, { 
            background: '#272733', color: '#fff', border: '1px solid #363645', 
            borderRadius: '5px', padding: '3px 10px', margin: '0 2px', 
            cursor: 'pointer', fontSize: '13px' 
        });
        b.onclick = cb; 
        return b;
    }

    #label(txt) { 
        const s = document.createElement('span'); 
        s.textContent = txt; 
        Object.assign(s.style, { margin: '0 4px', color: '#aaa', fontSize: '13px' }); 
        return s; 
    }

    #isBlackKey(midi) { 
        return [1, 3, 6, 8, 10].includes(midi % 12); 
    }

    setZoomX(val) { 
        this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val)); 
        this.lastGridState = null; // Force grid update
        this.draw(); 
    }

    setZoomY(val) { 
        this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val)); 
        this.lastGridState = null; // Force grid update
        this.isDrawn = false; // Force structure rebuild for row height changes
        this.draw(); 
    }

    destroy() {
        this.stopPlayheadAnimation();
        if (this._keyListener) { 
            document.removeEventListener("keydown", this._keyListener); 
            this._keyListener = null; 
        }
        this.noteElementMap.clear();
        this.rowElements.clear();
        if (this.rollGrid) this.rollGrid.innerHTML = '';
    }
}

export default PianoRoll;

