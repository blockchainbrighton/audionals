/**
 * @file PianoRoll.js
 * @description Piano roll UI component for the BOP Synthesizer.
 * Refactored to accept a container element and use event-driven communication.
 */

export class PianoRoll {
    constructor(containerElement, eventBus, state) {
        this.rollGrid = containerElement; // Accepts the direct element
        this.eventBus = eventBus;
        this.state = state;
        
        this.scrollContainer = null;
        this.innerContent = null;
        this.MIDI_LOW = 21;
        this.MIDI_HIGH = 108;
        this.CELL_H = 18;
        this.zoomX = 1;
        this.zoomY = 1;
        this.minZoomX = 0.25;
        this.maxZoomX = 4;
        this.minZoomY = 0.5;
        this.maxZoomY = 2.5;
        this.transportInterval = null;
        this.dragData = null;
        this.dragNoteIndex = null;
        this.lastPreviewMidi = null;
        this._keyListener = null;
        this.quantizeEnabled = false;
        this.quantizeGrid = 0.25;
        this.Tone = null;

        if (!this.rollGrid) {
            console.warn('[PianoRoll] Cannot initialize; a valid container element was not provided.');
            return;
        }
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupEventListeners();
        this.draw();
    }
    
    createUI() {
        this.rollGrid.innerHTML = ''; // Clear previous content
        Object.assign(this.rollGrid.style, {
            position: 'relative', background: '#181a1b', width: '100%', height: '60vh',
            display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px', userSelect: 'none', overflow: 'hidden'
        });

        // Controls Bar
        const bar = this._div({
            display: 'flex', gap: '10px', alignItems: 'center', background: '#212126',
            borderBottom: '2px solid #29292d', padding: '7px 10px', position: 'sticky',
            top: 0, zIndex: 30, minHeight: '32px'
        });
        bar.append(
            this._label('Zoom X:'),
            this._btn('-', () => this.setZoomX(this.zoomX / 1.3)),
            this._btn('+', () => this.setZoomX(this.zoomX * 1.3)),
            this._label('Zoom Y:'),
            this._btn('–', () => this.setZoomY(this.zoomY / 1.15)),
            this._btn('∣∣', () => this.setZoomY(this.zoomY * 1.15))
        );
        this.rollGrid.appendChild(bar);

        // Scrollable Container
        this.scrollContainer = this._div({
            display: 'flex', flexGrow: 1, overflowX: 'auto', overflowY: 'auto',
            minWidth: 0, minHeight: 0, position: 'relative', background: 'transparent'
        });
        this.rollGrid.appendChild(this.scrollContainer);

        // Main Content Area
        this.innerContent = this._div({
            display: 'flex', flexDirection: 'column', width: '100%',
            minHeight: '100%', position: 'relative'
        });
        this.scrollContainer.appendChild(this.innerContent);
    }

    setupEventListeners() {
        // Listen for piano roll redraw requests
        this.eventBus.addEventListener('pianoroll-redraw', () => {
            this.draw();
        });
        
        // Listen for sequence changes
        this.eventBus.addEventListener('sequence-changed', () => {
            this.draw();
        });
        
        // Listen for note selection events
        this.eventBus.addEventListener('note-selected', (e) => {
            const { noteIndex } = e.detail;
            this.state.selNote = noteIndex;
            this.draw();
        });
        
        // Listen for quantization changes
        this.eventBus.addEventListener('quantization-changed', (e) => {
            const { enabled, gridValue } = e.detail;
            this.quantizeEnabled = enabled;
            this.quantizeGrid = gridValue;
            this.draw();
        });
        
        // Listen for playback state changes
        this.eventBus.addEventListener('recording-state-changed', (e) => {
            const { isPlaying } = e.detail;
            if (isPlaying) {
                this.startPlayheadAnimation();
            } else {
                this.stopPlayheadAnimation();
            }
        });
        
        // Listen for Tone.js availability
        this.eventBus.addEventListener('tone-ready', (e) => {
            this.Tone = e.detail.Tone;
            this.draw();
        });

        // Keyboard shortcut listener for note deletion
        if (!this._keyListener) {
            this._keyListener = (e) => {
                if ((e.key === "Delete" || e.key === "Backspace") && 
                    typeof this.state.selNote === "number" && this.state.selNote >= 0) {
                    
                    // Emit note deletion event
                    this.eventBus.dispatchEvent(new CustomEvent('note-delete', {
                        detail: { noteIndex: this.state.selNote }
                    }));
                    
                    // Update local state
                    this.state.seq.splice(this.state.selNote, 1);
                    this.state.selNote = null;
                    this.draw();
                    
                    // Emit sequence changed event
                    this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }
    }

    draw() {
        if (!this.innerContent) return; // Don't draw if not initialized
        
        // Use global Tone if not set locally
        const Tone = this.Tone || window.Tone;
        if (!Tone) {
            console.warn('[PianoRoll] Cannot draw; Tone.js not available.');
            return;
        }

        const seq = this.state.seq || [];
        const quantGrid = this.quantizeEnabled ? this.quantizeGrid : null;
        
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const gridTimeCount = quantGrid ? Math.ceil(timeMax / quantGrid) * quantGrid : Math.ceil(timeMax / 0.25) * 0.25;
        const cellW = 40 * this.zoomX;
        const cellH = this.CELL_H * this.zoomY;

        this.innerContent.innerHTML = '';
        const gridWidth = cellW * gridTimeCount;

        for (let midi = this.MIDI_HIGH; midi >= this.MIDI_LOW; midi--) {
            const rowDiv = this._div({ display: 'flex', height: cellH + 'px', minHeight: cellH + 'px', position: 'relative' });
            const noteName = Tone.Frequency(midi, "midi").toNote();

            // --- Row Label ---
            const labelCell = this._div({
                width: '48px', minWidth: '48px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '8px', fontWeight: (midi % 12 === 0) ? 'bold' : 'normal', color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: this.isBlackKey(midi) ? '#18181c' : '#232323', borderBottom: '1px solid #23232a', fontSize: '13px',
                userSelect: 'none', zIndex: 2, borderRight: '2px solid #282828'
            }, noteName);
            
            // --- Grid Area for the Row ---
            const gridCell = this._div({ position: 'relative', flexGrow: 1, height: '100%', minHeight: '100%', background: 'transparent' });
            this.drawGridLines(gridCell, midi, gridTimeCount, quantGrid, cellW);
            this.drawNotesInRow(gridCell, midi, seq, cellW, Tone);

            rowDiv.append(labelCell, gridCell);
            this.innerContent.appendChild(rowDiv);
        }

        this.innerContent.style.width = `calc(48px + ${gridWidth}px)`;
        this.setupDragListeners(cellW, Tone);
        this.updatePlayhead(cellW);
        
        // Deselect on Empty Click
        this.innerContent.onclick = (e) => {
            if (e.target.classList.contains('roll-note') || e.target.closest('.roll-note')) return;
            this.state.selNote = null;
            this.innerContent.querySelectorAll('.roll-note').forEach(el => el.style.outline = 'none');
            
            // Emit note deselection event
            this.eventBus.dispatchEvent(new CustomEvent('note-deselected'));
        };
    }

    drawGridLines(gridCell, midi, gridTimeCount, quantGrid, cellW) {
        // Horizontal Line
        gridCell.appendChild(this._div({
            position: 'absolute', left: 0, right: 0, top: 0, height: '1px',
            background: (midi % 12 === 0) ? '#444' : '#292b2e',
            opacity: (midi % 12 === 0) ? 0.55 : 0.22, pointerEvents: 'none', zIndex: 1
        }));

        // Black key background shading
        if (this.isBlackKey(midi)) {
            gridCell.appendChild(this._div({
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                background: '#1c1c22', opacity: 0.46, zIndex: 0, pointerEvents: 'none'
            }));
        }

        // Vertical Lines (only draw them once for the top row)
        if (quantGrid && midi === this.MIDI_HIGH) {
            for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                const isBar = (Math.round(t / 4) * 4 === t);
                gridCell.appendChild(this._div({
                    position: 'absolute', top: 0, bottom: `-${(this.MIDI_HIGH - this.MIDI_LOW) * this.CELL_H * this.zoomY}px`,
                    left: (t * cellW) + 'px', width: isBar ? '2px' : '1px',
                    background: isBar ? '#444' : '#292b2e', opacity: isBar ? 0.6 : 0.22,
                    pointerEvents: 'none', zIndex: 1
                }));
            }
        }
    }

    drawNotesInRow(gridCell, midi, seq, cellW, Tone) {
        seq.forEach((noteObj, i) => {
            const noteMidi = Tone.Frequency(noteObj.note).toMidi();
            if (noteMidi !== midi) return;
            
            const x = noteObj.start * cellW;
            const w = noteObj.dur * cellW;

            const noteDiv = this._div({
                position: 'absolute', left: `${x}px`, width: `${w}px`, height: '100%',
                background: '#bb86fc', borderRadius: '4px', boxShadow: '0 2px 8px #0004',
                opacity: noteObj.vel, zIndex: 10, cursor: 'grab',
                outline: this.state.selNote === i ? '2px solid #03dac6' : 'none'
            });
            noteDiv.className = 'roll-note';
            noteDiv.dataset.idx = i;

            noteDiv.onclick = (evt) => {
                evt.stopPropagation();
                this.state.selNote = i;
                
                // Emit note selection event
                this.eventBus.dispatchEvent(new CustomEvent('note-selected', {
                    detail: { noteIndex: i, note: noteObj }
                }));
                
                // Play preview note
                this.eventBus.dispatchEvent(new CustomEvent('note-preview', {
                    detail: { note: noteObj.note, duration: 0.3, velocity: 0.9 }
                }));
                
                this.draw(); // Redraw to show selection
            };

            noteDiv.onmousedown = (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                this.dragData = { startX: e.clientX, startY: e.clientY, origStart: noteObj.start, origMidi: midi };
                this.dragNoteIndex = i;
                this.lastPreviewMidi = midi;
                document.body.style.cursor = 'move';
            };
            
            gridCell.appendChild(noteDiv);
        });
    }

    setupDragListeners(cellW, Tone) {
        const onMove = (e) => {
            if (!this.dragData || this.dragNoteIndex === null) return;
            const note = this.state.seq[this.dragNoteIndex];
            
            const dx = e.clientX - this.dragData.startX;
            const dy = e.clientY - this.dragData.startY;
            const dt = dx / cellW;
            
            const currentQuantGrid = this.quantizeEnabled ? this.quantizeGrid : null;
            const newStart = this.dragData.origStart + dt;
            note.start = Math.max(0, currentQuantGrid ? Math.round(newStart / currentQuantGrid) * currentQuantGrid : newStart);

            const dpitch = -Math.round(dy / (this.CELL_H * this.zoomY));
            const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, this.dragData.origMidi + dpitch));
            note.note = Tone.Frequency(newMidi, "midi").toNote();
            
            // Preview sound on pitch change
            if (this.lastPreviewMidi !== newMidi) {
                this.eventBus.dispatchEvent(new CustomEvent('note-preview', {
                    detail: { note: note.note, duration: 0.3, velocity: 0.9 }
                }));
                this.lastPreviewMidi = newMidi;
            }
            
            this.draw(); // Redraw on drag
        };

        const onUp = () => {
            if (this.dragNoteIndex !== null) {
                // Emit note edited event
                this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                    detail: { 
                        noteIndex: this.dragNoteIndex, 
                        note: this.state.seq[this.dragNoteIndex] 
                    }
                }));
                
                // Emit sequence changed event
                this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
            }
            
            this.dragData = null;
            this.dragNoteIndex = null;
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        // These listeners are added on mousedown and removed on mouseup
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp, { once: true });
    }

    startPlayheadAnimation() {
        if (!this.transportInterval) {
            this.transportInterval = setInterval(() => {
                const cellW = 40 * this.zoomX;
                this.updatePlayhead(cellW);
            }, 33); // ~30fps
        }
    }
    
    stopPlayheadAnimation() {
        if (this.transportInterval) {
            clearInterval(this.transportInterval);
            this.transportInterval = null;
        }
        
        // Remove playhead
        const oldPh = this.scrollContainer?.querySelector('.playhead');
        if (oldPh) oldPh.remove();
    }

    updatePlayhead(cellW) {
        if (!this.innerContent || !this.scrollContainer) return;
        
        // Use global Tone if not set locally
        const Tone = this.Tone || window.Tone;
        if (!Tone) return;
        
        const playTime = Tone.Transport.seconds;
        
        // Remove old playhead if playback stopped
        if (!this.state.isPlaying) {
            this.stopPlayheadAnimation();
            return;
        }
        
        let ph = this.scrollContainer.querySelector('.playhead');
        if (!ph) {
            ph = this._div({
                position: 'absolute', top: 0, width: '3px', background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                opacity: 0.9, zIndex: 99, pointerEvents: 'none'
            });
            ph.className = 'playhead';
            this.scrollContainer.appendChild(ph);
        }
        
        ph.style.left = `${playTime * cellW + 48}px`; // Offset by label column width
        ph.style.height = `${this.innerContent.scrollHeight}px`;
    }
    
    // --- Helper and Utility Methods ---
    _div(style, text) { 
        const d = document.createElement('div'); 
        Object.assign(d.style, style); 
        if(text) d.textContent = text; 
        return d; 
    }
    
    _btn(txt, cb) { 
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
    
    _label(txt) { 
        const s = document.createElement('span'); 
        s.textContent = txt; 
        Object.assign(s.style, {
            margin: '0 4px', color: '#aaa', fontSize: '13px'
        }); 
        return s; 
    }
    
    isBlackKey(midi) { 
        return [1, 3, 6, 8, 10].includes(midi % 12); 
    }
    
    setZoomX(val) { 
        this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val)); 
        this.draw(); 
    }
    
    setZoomY(val) { 
        this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val)); 
        this.draw(); 
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        this.stopPlayheadAnimation();
        if (this._keyListener) {
            document.removeEventListener("keydown", this._keyListener);
            this._keyListener = null;
        }
        if (this.rollGrid) {
            this.rollGrid.innerHTML = '';
        }
    }
}

export default PianoRoll;

