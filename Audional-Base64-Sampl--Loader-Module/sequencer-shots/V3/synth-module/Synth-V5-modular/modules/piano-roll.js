// modules/piano-roll.js
export const PianoRoll = {
    init() {
        this.rollGrid = document.getElementById('rollGrid');
        if (!this.rollGrid) return;

        this.rollGrid.classList.add('piano-roll-scrollable');
        this.rollGrid.style.minHeight = '320px';
        this.rollGrid.style.minWidth = '800px';
        this.rollGrid.style.position = 'relative';
        this.rollGrid.style.overflow = 'auto';
        this.rollGrid.style.background = '#181a1b';

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
    },

    draw() {
        let seq = synthApp.seq || [];
        this.rollGrid.innerHTML = '';

        // Grid bounds
        let timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        let pitchMin = Math.min(48, ...seq.map(o => Tone.Frequency(o.note).toMidi()));
        let pitchMax = Math.max(72, ...seq.map(o => Tone.Frequency(o.note).toMidi()));
        let gridPitchCount = pitchMax - pitchMin + 1;

        // Build grid
        const timeGrid = this.ce('div', 'time-grid');
        const pitchGrid = this.ce('div', 'pitch-grid');
        this.rollGrid.append(timeGrid, pitchGrid);

        // Vertical grid lines (time)
        let step = 1, gridTimeCount = Math.ceil(timeMax / step);
        for (let i = 0; i <= gridTimeCount; i++) {
            let l = this.ce('div', 'time-line');
            l.style.position = 'absolute';
            l.style.left = (i * step / timeMax) * 100 + '%';
            l.style.top = '0';
            l.style.width = '1px';
            l.style.height = '100%';
            l.style.background = i % 4 === 0 ? '#444' : '#292b2e';
            l.style.opacity = i % 4 === 0 ? 0.7 : 0.3;
            timeGrid.appendChild(l);
        }
        // Horizontal grid lines (pitch)
        for (let i = 0; i <= gridPitchCount; i++) {
            let l = this.ce('div', 'pitch-line');
            l.style.position = 'absolute';
            l.style.left = '0';
            l.style.top = (i / gridPitchCount) * 100 + '%';
            l.style.width = '100%';
            l.style.height = '1px';
            l.style.background = '#292b2e';
            l.style.opacity = i % 12 === 0 ? 0.6 : 0.25;
            pitchGrid.appendChild(l);
        }

        this.rollGrid.style.width = Math.max(800, timeMax * 40) + 'px';
        this.rollGrid.style.height = Math.max(320, gridPitchCount * 18) + 'px';

        // --- Note Interactivity ---
        let dragData = null;
        let isDragging = false;
        let dragNoteIndex = null;
        let lastPreviewMidi = null;
        let previewSynth = null;

        // Utility: play a MIDI note preview
        const playPreview = midi => {
            if (!window.synthApp.synth) return;
            if (previewSynth) {
                previewSynth.triggerRelease && previewSynth.triggerRelease();
            }
            // Use the app synth but with fast decay to avoid hanging
            window.synthApp.synth.triggerAttackRelease(
                Tone.Frequency(midi, "midi").toNote(),
                0.3, // quick preview
                undefined,
                0.9 // full velocity
            );
        };

        seq.forEach((o, i) => {
            let noteMidi = Tone.Frequency(o.note).toMidi();
            let noteDiv = this.ce('div', 'roll-note');
            noteDiv.dataset.idx = i;
            noteDiv.tabIndex = 0;

            // Position & size
            noteDiv.style.position = 'absolute';
            noteDiv.style.left = ((o.start) / timeMax * 100) + '%';
            noteDiv.style.width = (o.dur / timeMax * 100) + '%';
            noteDiv.style.top = ((pitchMax - noteMidi) / gridPitchCount * 100) + '%';
            noteDiv.style.height = (1 / gridPitchCount * 100) + '%';
            noteDiv.style.background = '#bb86fc';
            noteDiv.style.opacity = o.vel;
            noteDiv.style.borderRadius = '4px';

            // --- Selection & play on click ---
            noteDiv.onclick = evt => {
                evt.stopPropagation();
                this.rollGrid.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
                noteDiv.classList.add('selected');
                synthApp.selNote = i;
                playPreview(noteMidi);
            };

            // --- Drag-to-move: handle mouse drag globally ---
            noteDiv.onmousedown = (e) => {
                if (e.button !== 0) return; // left click only
                e.stopPropagation();
                dragData = {
                    i,
                    startX: e.clientX,
                    startY: e.clientY,
                    origStart: o.start,
                    origMidi: noteMidi
                };
                dragNoteIndex = i;
                isDragging = true;
                lastPreviewMidi = noteMidi;
                document.body.style.cursor = 'move';
            };

            // Optional: you can add a resize handle here for duration

            this.rollGrid.appendChild(noteDiv);
        });

        // --- Mouse move/up for drag ---
        const onMove = (e) => {
            if (!dragData || dragNoteIndex === null) return;
            let note = seq[dragNoteIndex];
            let dx = (e.clientX - dragData.startX);
            let dy = (e.clientY - dragData.startY);
            let gridW = this.rollGrid.offsetWidth, gridH = this.rollGrid.offsetHeight;
            let localTimeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
            let localGridPitchCount = pitchMax - pitchMin + 1;

            // Move horizontally (time)
            let dt = (dx / gridW) * localTimeMax;
            note.start = Math.max(0, Math.round((dragData.origStart + dt) * 100) / 100);

            // Move vertically (pitch)
            let dpitch = Math.round(-(dy / gridH) * localGridPitchCount);
            let newMidi = Math.max(pitchMin, Math.min(pitchMax, dragData.origMidi + dpitch));
            if (note.note !== Tone.Frequency(newMidi, "midi").toNote()) {
                note.note = Tone.Frequency(newMidi, "midi").toNote();
                // Live play preview of new pitch if changed
                if (lastPreviewMidi !== newMidi) {
                    playPreview(newMidi);
                    lastPreviewMidi = newMidi;
                }
            }
            this.draw();
        };

        const onUp = (e) => {
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

        // Deselect notes if clicking empty space
        this.rollGrid.onclick = () => {
            synthApp.selNote = null;
            this.rollGrid.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
        };
    },

    ce(tag, cls, note) {
        let e = document.createElement(tag);
        e.className = cls;
        if (note) e.dataset.note = note;
        return e;
    }
};
