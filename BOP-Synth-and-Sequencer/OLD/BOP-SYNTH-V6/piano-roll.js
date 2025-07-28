// --- piano-roll.js ---

// This module depends on LoopManager, so we import it here.
import LoopManager from './loop-manager.js';

const PianoRoll = {
    MIDI_LOW: 21,
    MIDI_HIGH: 108,
    zoomX: 1,
    zoomY: 1,
    minZoomX: 0.25,
    maxZoomX: 4,
    minZoomY: 0.5,
    maxZoomY: 2.5,
    CELL_H: 18,
    transportInterval: null,
    dragData: null,
    dragNoteIndex: null,
    lastPreviewMidi: null,

    init() {
        const grid = this.rollGrid = document.getElementById('rollGrid');
        if (!grid) return;

        grid.innerHTML = '';
        Object.assign(grid.style, {
            position: 'relative',
            background: '#181a1b',
            width: '100%',
            height: '60vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px',
            userSelect: 'none',
            overflow: 'hidden'
        });

        // Controls Bar
        const bar = this._div({
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            background: '#212126',
            borderBottom: '2px solid #29292d',
            padding: '7px 10px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            minHeight: '32px'
        });
        bar.append(
            this._label('Zoom X:'),
            this._btn('-', () => this.setZoomX(this.zoomX / 1.3)),
            this._btn('+', () => this.setZoomX(this.zoomX * 1.3)),
            this._label('Zoom Y:'),
            this._btn('–', () => this.setZoomY(this.zoomY / 1.15)),
            this._btn('∣∣', () => this.setZoomY(this.zoomY * 1.15))
        );
        grid.appendChild(bar);

        this.pitchCount = this.MIDI_HIGH - this.MIDI_LOW + 1;

        // Scrollable Container
        this.scrollContainer = this._div({
            display: 'flex',
            flexGrow: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            background: 'transparent'
        });
        grid.appendChild(this.scrollContainer);

        // Main Content Area
        this.innerContent = this._div({
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100%',
            position: 'relative'
        });
        this.scrollContainer.appendChild(this.innerContent);

        // Keyboard Shortcut Listener
        if (!this._keyListener) {
            this._keyListener = (e) => {
                if ((e.key === "Delete" || e.key === "Backspace") &&
                    typeof window.synthApp.selNote === "number" && window.synthApp.selNote >= 0) {
                    window.synthApp.seq.splice(window.synthApp.selNote, 1);
                    window.synthApp.selNote = null;
                    this.draw();
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }
        this.draw();
    },

    draw() {
        const seq = window.synthApp.seq || [];
        const quantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const gridTimeCount = quantGrid
            ? Math.ceil(timeMax / quantGrid) * quantGrid
            : Math.ceil(timeMax / 0.25) * 0.25;
        const cellW = 40 * this.zoomX;
        const cellH = this.CELL_H * this.zoomY;
        this.innerContent.innerHTML = '';
        const gridWidth = cellW * gridTimeCount;
        let firstNoteElement = null, c4Element = null, firstNoteMidi = null;

        if (seq.length > 0 && seq[0]?.note) {
            try { firstNoteMidi = Tone.Frequency(seq[0].note).toMidi(); }
            catch (e) {
                console.warn("Error parsing first note for scroll:", seq[0].note, e);
                firstNoteMidi = null;
            }
        }

        for (let midi = this.MIDI_HIGH; midi >= this.MIDI_LOW; midi--) {
            const isC4 = midi === 60, isCurrentFirstNote = midi === firstNoteMidi, row = this.MIDI_HIGH - midi;

            const rowDiv = this._div({
                display: 'flex',
                height: cellH + 'px',
                minHeight: cellH + 'px',
                position: 'relative'
            });

            const labelCell = this._div({
                width: '48px', minWidth: '48px', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
                fontWeight: (midi % 12 === 0) ? 'bold' : 'normal',
                color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: this.isBlackKey(midi) ? '#18181c' : '#232323',
                borderBottom: '1px solid #23232a',
                fontSize: '13px', userSelect: 'none', zIndex: 2, borderRight: '2px solid #282828'
            }, window.Tone ? Tone.Frequency(midi, "midi").toNote() : midi);

            const gridCell = this._div({
                position: 'relative',
                flexGrow: 1,
                height: '100%',
                minHeight: '100%',
                background: 'transparent'
            });

            const hLine = this._div({
                position: 'absolute', left: 0, right: 0, top: 0, height: '1px',
                background: (midi % 12 === 0) ? '#444' : '#292b2e',
                opacity: (midi % 12 === 0) ? 0.55 : 0.22,
                pointerEvents: 'none', zIndex: 1
            });
            gridCell.appendChild(hLine);

            if (this.isBlackKey(midi)) {
                const bg = this._div({
                    position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                    background: '#1c1c22', opacity: 0.46, zIndex: 0, pointerEvents: 'none'
                });
                gridCell.appendChild(bg);
            }

            if (quantGrid) {
                for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                    const isBar = (Math.round(t / 4) * 4 === t);
                    const vLine = this._div({
                        position: 'absolute', top: 0, bottom: 0, left: (t * cellW) + 'px',
                        width: isBar ? '2px' : '1px',
                        background: isBar ? '#444' : '#292b2e',
                        opacity: isBar ? 0.6 : 0.22,
                        pointerEvents: 'none', zIndex: 1
                    });
                    gridCell.appendChild(vLine);

                    if (isBar && t !== 0 && midi === this.MIDI_HIGH) {
                        const labelTop = this._div({
                            position: 'absolute', top: '-18px', left: (t * cellW) + 2 + 'px',
                            fontSize: '12px', color: '#555', zIndex: 10, pointerEvents: 'none'
                        }, `Bar ${Math.floor(t / 4) + 1}`);
                        this.innerContent.appendChild(labelTop);
                    }
                }
            }

            rowDiv.appendChild(labelCell);
            rowDiv.appendChild(gridCell);
            this.innerContent.appendChild(rowDiv);

            if (isC4) c4Element = rowDiv;
            if (isCurrentFirstNote) firstNoteElement = rowDiv;

            seq.forEach((noteObj, i) => {
                const noteMidi = Tone.Frequency(noteObj.note).toMidi();
                if (noteMidi !== midi) return;
                const x = noteObj.start * cellW, w = noteObj.dur * cellW;

                const noteDiv = this._div({
                    position: 'absolute', left: x + 'px', width: w + 'px', height: '100%',
                    background: '#bb86fc', borderRadius: '4px', boxShadow: '0 2px 8px #0004',
                    opacity: noteObj.vel,
                    outline: window.synthApp.selNote === i ? '2px solid #03dac6' : '',
                    zIndex: 10, cursor: 'grab', display: 'flex',
                    alignItems: 'center', justifyContent: 'flex-end', paddingRight: '2px',
                    fontWeight: 'bold', color: '#232323'
                }, '');

                noteDiv.dataset.idx = i;
                noteDiv.tabIndex = 0;

                noteDiv.onclick = (evt) => {
                    evt.stopPropagation();
                    this.innerContent.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
                    noteDiv.classList.add('selected');
                    window.synthApp.selNote = i;
                    window.synthApp?.synth?.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), 0.3, undefined, 0.9);
                };

                noteDiv.onmousedown = (e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    this.dragData = {
                        i, startX: e.clientX, startY: e.clientY,
                        origStart: noteObj.start, origMidi: midi
                    };
                    this.dragNoteIndex = i;
                    this.lastPreviewMidi = midi;
                    document.body.style.cursor = 'move';
                };

                noteDiv.className = 'roll-note';
                gridCell.appendChild(noteDiv);
            });
        }
        this.innerContent.style.width = `calc(48px + ${gridWidth}px)`;

        // --- Scrolling Logic ---
        requestAnimationFrame(() => {
            if (this.scrollContainer) {
                const containerRect = this.scrollContainer.getBoundingClientRect();
                const containerHeight = containerRect.height;
                let targetElement = null;
                if (seq.length > 0 && firstNoteElement) targetElement = firstNoteElement;
                else if (c4Element) targetElement = c4Element;
                if (targetElement) {
                    const targetRect = targetElement.getBoundingClientRect();
                    const scrollTopTarget = targetRect.top - containerRect.top - (containerHeight / 2) + (targetRect.height / 2) + this.scrollContainer.scrollTop;
                    this.scrollContainer.scrollTo({ top: scrollTopTarget, behavior: 'auto' });
                }
            }
        });

        // --- Setup Drag Listeners ---
        const onMove = (e) => {
            if (!this.dragData || this.dragNoteIndex === null) return;
            const currentSeq = window.synthApp.seq;
            const note = currentSeq[this.dragNoteIndex];
            const dx = (e.clientX - this.dragData.startX);
            const dy = (e.clientY - this.dragData.startY);
            let dt = dx / (40 * this.zoomX);
            const currentQuantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
            let newStart = currentQuantGrid
                ? Math.round((this.dragData.origStart + dt) / currentQuantGrid) * currentQuantGrid
                : this.dragData.origStart + dt;
            note.start = Math.max(0, Math.round(newStart * 1000) / 1000);
            const dpitch = -Math.round(dy / (this.CELL_H * this.zoomY));
            const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, this.dragData.origMidi + dpitch));
            if (note.note !== Tone.Frequency(newMidi, "midi").toNote()) {
                note.note = Tone.Frequency(newMidi, "midi").toNote();
                if (this.lastPreviewMidi !== newMidi && window.synthApp?.synth) {
                    window.synthApp.synth.triggerAttackRelease(
                        Tone.Frequency(newMidi, "midi").toNote(), 0.3, undefined, 0.9
                    );
                    this.lastPreviewMidi = newMidi;
                }
            }
            this.draw();
        };

        const onUp = () => {
            this.dragData = null;
            this.dragNoteIndex = null;
            this.lastPreviewMidi = null;
            document.body.style.cursor = '';
        };

        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        // --- Deselect on Empty Click ---
        this.innerContent.onclick = (e) => {
            if (e.target.classList.contains('roll-note') || e.target.closest('.roll-note')) return;
            window.synthApp.selNote = null;
            this.innerContent.querySelectorAll('.roll-note').forEach(el => el.classList.remove('selected'));
        };

        // --- Playhead ---
        if (window.synthApp.isPlaying) {
            this._drawPlayhead(window.synthApp.currentTime || 0, cellW);
            if (!this.transportInterval) {
                this.transportInterval = setInterval(() => {
                    this._drawPlayhead(window.synthApp.currentTime || 0, cellW);
                }, 33); // ~30fps
            }
        } else if (this.transportInterval) {
            clearInterval(this.transportInterval);
            this.transportInterval = null;
            const ph = this.scrollContainer.querySelector('.playhead');
            if (ph) ph.remove();
        }
    },

    _drawPlayhead(playTime, cellW) {
        if (!this.innerContent || !this.scrollContainer) return; // Safety check

        let ph = this.scrollContainer.querySelector('.playhead');
        if (!ph) {
            ph = this._div({
                position: 'absolute',
                top: 0,
                width: '3px',
                background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                opacity: 0.9,
                zIndex: 99,
                pointerEvents: 'none'
            });
            ph.className = 'playhead';
            this.scrollContainer.appendChild(ph);
        }
        
        ph.style.left = (playTime * cellW + 48) + 'px'; // Offset by label column width
        ph.style.height = this.innerContent.scrollHeight + 'px';
    },

    // --- Utility Functions ---

    _div(styleObj, text) {
        const d = document.createElement('div');
        Object.assign(d.style, styleObj);
        if (text !== undefined) d.textContent = text;
        return d;
    },

    _btn(txt, onClick) {
        const btn = document.createElement('button');
        btn.textContent = txt;
        Object.assign(btn.style, {
            background: '#272733',
            color: '#fff',
            border: '1px solid #363645',
            borderRadius: '5px',
            padding: '3px 10px',
            margin: '0 2px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            outline: 'none',
            transition: 'background 0.15s'
        });
        btn.onmouseover = () => btn.style.background = '#363645';
        btn.onmouseout = () => btn.style.background = '#272733';
        btn.onclick = onClick;
        return btn;
    },

    _label(txt) {
        const span = document.createElement('span');
        span.textContent = txt;
        Object.assign(span.style, {
            margin: '0 4px',
            color: '#aaa',
            fontSize: '13px'
        });
        return span;
    },

    isBlackKey(midi) {
        return [1, 3, 6, 8, 10].includes(midi % 12); // Semitone offsets for black keys
    },
    
    setZoomX(val) {
        this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val));
        this.draw();
    },

    setZoomY(val) {
        this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val));
        this.draw();
    }
};

export default PianoRoll;