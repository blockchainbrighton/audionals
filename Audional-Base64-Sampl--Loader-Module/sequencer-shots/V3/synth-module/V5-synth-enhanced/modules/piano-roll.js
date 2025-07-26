// modules/piano-roll.js
export const PianoRoll = {
    /** Constants for piano range */
    MIDI_LOW: 21,  // A0
    MIDI_HIGH: 108, // C8

    init() {
        // Build layout on first run
        this.rollGrid = document.getElementById('rollGrid');
        if (!this.rollGrid) return;

        // Remove all children and prepare container
        this.rollGrid.innerHTML = '';

        // --- Styles for outer container (fills available space, scrollable) ---
        Object.assign(this.rollGrid.style, {
            position: 'relative',
            background: '#181a1b',
            minWidth: '800px',
            minHeight: '320px',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px',
            userSelect: 'none'
        });

        // --- SCROLLABLE WRAPPER (for both axis scroll) ---
        if (!this.scroller) {
            this.scroller = document.createElement('div');
            Object.assign(this.scroller.style, {
                position: 'absolute',
                inset: 0,
                overflow: 'scroll',
                width: '100%',
                height: '100%'
            });
            this.rollGrid.appendChild(this.scroller);
        }
        this.scroller.innerHTML = ''; // clear

        // --- MAIN FLEX LAYOUT: [key-labels][grid] side-by-side ---
        this.mainRow = document.createElement('div');
        Object.assign(this.mainRow.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            minHeight: '320px',
            minWidth: '800px',
            width: 'fit-content'
        });
        this.scroller.appendChild(this.mainRow);

        // --- KEY LABELS COLUMN (88 keys tall) ---
        this.labelsCol = document.createElement('div');
        Object.assign(this.labelsCol.style, {
            display: 'flex',
            flexDirection: 'column-reverse', // so A0 is at bottom, C8 at top
            background: '#232323',
            borderRight: '2px solid #282828',
            position: 'sticky',
            left: 0,
            zIndex: 2,
            minWidth: '48px',
            width: '48px',
            userSelect: 'none'
        });
        this.mainRow.appendChild(this.labelsCol);

        // --- GRID WRAPPER (holds everything else, scrolls with notes) ---
        this.gridWrap = document.createElement('div');
        Object.assign(this.gridWrap.style, {
            position: 'relative',
            flex: 1,
            minWidth: '760px',
            minHeight: '1584px', // 18px x 88
            width: 'fit-content',
            height: 'fit-content',
            background: 'transparent'
        });
        this.mainRow.appendChild(this.gridWrap);

        // Key labels (always 88)
        for (let midi = this.MIDI_LOW; midi <= this.MIDI_HIGH; ++midi) {
            const noteName = Tone.Frequency(midi, "midi").toNote();
            const label = document.createElement('div');
            label.textContent = noteName;
            Object.assign(label.style, {
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '8px',
                fontWeight: (midi % 12 === 0) ? 'bold' : 'normal',
                color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: (this.isBlackKey(midi) ? '#18181c' : 'transparent'),
                borderBottom: '1px solid #23232a',
                fontSize: '13px',
            });
            this.labelsCol.appendChild(label);
        }

        // Handle keyboard shortcuts (delete selected note)
        if (!this._keyListener) {
            this._keyListener = (e) => {
                if (
                    (e.key === "Delete" || e.key === "Backspace") &&
                    typeof synthApp.selNote === "number" &&
                    synthApp.selNote >= 0
                ) {
                    synthApp.seq.splice(synthApp.selNote, 1);
                    synthApp.selNote = null;
                    this.draw();
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }

        this.draw();
    },

    draw() {
        const seq = synthApp.seq || [];

        // Grid range and sizing
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const gridTimeCount = Math.ceil(timeMax);
        const gridPitchCount = this.MIDI_HIGH - this.MIDI_LOW + 1;
        const cellW = 40; // px per time step
        const cellH = 18; // px per pitch

        // --- Clear and rebuild grid ---
        this.gridWrap.innerHTML = '';

        // --- Draw horizontal pitch lines (1 per key) ---
        for (let i = 0; i <= gridPitchCount; ++i) {
            const line = document.createElement('div');
            Object.assign(line.style, {
                position: 'absolute',
                left: 0,
                width: (cellW * gridTimeCount) + 'px',
                top: (i * cellH) + 'px',
                height: '1px',
                background: (i + this.MIDI_LOW) % 12 === 0 ? '#444' : '#292b2e',
                opacity: (i + this.MIDI_LOW) % 12 === 0 ? 0.55 : 0.22,
                pointerEvents: 'none',
                zIndex: 1,
            });
            this.gridWrap.appendChild(line);
        }

        // --- Draw vertical time lines ---
        for (let t = 0; t <= gridTimeCount; ++t) {
            const line = document.createElement('div');
            Object.assign(line.style, {
                position: 'absolute',
                top: 0,
                left: (t * cellW) + 'px',
                width: t % 4 === 0 ? '2px' : '1px',
                height: (cellH * gridPitchCount) + 'px',
                background: t % 4 === 0 ? '#444' : '#292b2e',
                opacity: t % 4 === 0 ? 0.6 : 0.22,
                pointerEvents: 'none',
                zIndex: 1,
            });
            this.gridWrap.appendChild(line);
        }

        // --- Background fill for black/white keys ---
        for (let i = 0; i < gridPitchCount; ++i) {
            const midi = this.MIDI_HIGH - i;
            if (this.isBlackKey(midi)) {
                const bg = document.createElement('div');
                Object.assign(bg.style, {
                    position: 'absolute',
                    left: 0,
                    top: (i * cellH) + 'px',
                    width: (cellW * gridTimeCount) + 'px',
                    height: cellH + 'px',
                    background: '#1c1c22',
                    opacity: 0.46,
                    zIndex: 0,
                    pointerEvents: 'none'
                });
                this.gridWrap.appendChild(bg);
            }
        }

        // --- Sizing for scroll and fit ---
        Object.assign(this.gridWrap.style, {
            width: (cellW * gridTimeCount) + 'px',
            height: (cellH * gridPitchCount) + 'px',
        });

        // --- Draw notes (interactive) ---
        let dragData = null;
        let isDragging = false;
        let dragNoteIndex = null;
        let lastPreviewMidi = null;
        let previewSynth = null;

        const playPreview = midi => {
            if (!window.synthApp.synth) return;
            if (previewSynth) {
                previewSynth.triggerRelease && previewSynth.triggerRelease();
            }
            window.synthApp.synth.triggerAttackRelease(
                Tone.Frequency(midi, "midi").toNote(),
                0.3,
                undefined,
                0.9
            );
        };

        seq.forEach((o, i) => {
            const midi = Tone.Frequency(o.note).toMidi();
            const y = (this.MIDI_HIGH - midi) * cellH;
            const x = o.start * cellW;
            const w = o.dur * cellW;
            const noteDiv = document.createElement('div');
            Object.assign(noteDiv.style, {
                position: 'absolute',
                top: y + 'px',
                left: x + 'px',
                width: w + 'px',
                height: cellH + 'px',
                background: '#bb86fc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px #0004',
                opacity: o.vel,
                outline: synthApp.selNote === i ? '2px solid #03dac6' : '',
                zIndex: 10,
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '2px',
                fontWeight: 'bold',
                color: '#232323'
            });
            noteDiv.dataset.idx = i;
            noteDiv.tabIndex = 0;

            noteDiv.onclick = evt => {
                evt.stopPropagation();
                this.gridWrap.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
                noteDiv.classList.add('selected');
                synthApp.selNote = i;
                playPreview(midi);
            };

            noteDiv.onmousedown = (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                dragData = {
                    i,
                    startX: e.clientX,
                    startY: e.clientY,
                    origStart: o.start,
                    origMidi: midi
                };
                dragNoteIndex = i;
                isDragging = true;
                lastPreviewMidi = midi;
                document.body.style.cursor = 'move';
            };

            noteDiv.className = 'roll-note';
            this.gridWrap.appendChild(noteDiv);
        });

        // Drag to move notes
        const onMove = (e) => {
            if (!dragData || dragNoteIndex === null) return;
            let note = seq[dragNoteIndex];
            let dx = (e.clientX - dragData.startX);
            let dy = (e.clientY - dragData.startY);
            // Move horizontally (time)
            let dt = (dx / cellW);
            note.start = Math.max(0, Math.round((dragData.origStart + dt) * 100) / 100);

            // Move vertically (pitch)
            let dpitch = -Math.round(dy / cellH);
            let newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, dragData.origMidi + dpitch));
            if (note.note !== Tone.Frequency(newMidi, "midi").toNote()) {
                note.note = Tone.Frequency(newMidi, "midi").toNote();
                if (lastPreviewMidi !== newMidi) {
                    playPreview(newMidi);
                    lastPreviewMidi = newMidi;
                }
            }
            this.draw();
        };
        const onUp = () => {
            if (dragData) {
                dragData = null;
                dragNoteIndex = null;
                isDragging = false;
                lastPreviewMidi = null;
                document.body.style.cursor = '';
            }
        };
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        // Deselect on empty click
        this.gridWrap.onclick = () => {
            synthApp.selNote = null;
            this.gridWrap.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
        };
    },

    isBlackKey(midi) {
        return [1, 3, 6, 8, 10].includes(midi % 12);
    }
};
