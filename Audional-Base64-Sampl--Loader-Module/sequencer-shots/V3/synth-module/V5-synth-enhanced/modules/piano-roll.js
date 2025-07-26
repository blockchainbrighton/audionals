// modules/piano-roll.js
import { LoopManager } from './loop.js';

export const PianoRoll = {
    MIDI_LOW: 21,
    MIDI_HIGH: 108,
    zoomX: 1,
    zoomY: 1,
    minZoomX: 0.25,
    maxZoomX: 4,
    minZoomY: 0.5,
    maxZoomY: 2.5,

    quantOptions: [
        { value: 1, label: 'Whole Note' },
        { value: 0.5, label: 'Half Note' },
        { value: 0.25, label: 'Quarter Note' },
        { value: 0.125, label: 'Eighth Note' },
        { value: 0.0625, label: 'Sixteenth Note' },
        { value: 0.03125, label: 'Thirty-second Note' }
    ],

    transportInterval: null,

    init() {
        this.rollGrid = document.getElementById('rollGrid');
        if (!this.rollGrid) return;
        this.rollGrid.innerHTML = '';

        Object.assign(this.rollGrid.style, {
            position: 'relative', background: '#181a1b',
            minWidth: '800px', minHeight: '320px',
            width: '100%', height: '100%', overflow: 'hidden',
            boxSizing: 'border-box', fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px', userSelect: 'none'
        });

        // --- Controls Bar ---
        this.controlsBar = document.createElement('div');
        Object.assign(this.controlsBar.style, {
            display: 'flex', gap: '10px', alignItems: 'center',
            background: '#212126', borderBottom: '2px solid #29292d',
            padding: '7px 10px', position: 'sticky', top: 0, zIndex: 30
        });
        this.rollGrid.appendChild(this.controlsBar);

        // --- Zoom controls ---
        this.zoomOutX = this._btn('-', () => this.setZoomX(this.zoomX / 1.3), 'Zoom Out (Horizontal)');
        this.zoomInX = this._btn('+', () => this.setZoomX(this.zoomX * 1.3), 'Zoom In (Horizontal)');
        this.zoomOutY = this._btn('–', () => this.setZoomY(this.zoomY / 1.15), 'Zoom Out (Vertical)');
        this.zoomInY = this._btn('∣∣', () => this.setZoomY(this.zoomY * 1.15), 'Zoom In (Vertical)');

        // --- Quantization controls (checkbox + dropdown) ---
        this.quantCheckbox = document.createElement('input');
        this.quantCheckbox.type = 'checkbox';
        this.quantCheckbox.style.marginLeft = '16px';
        this.quantCheckbox.checked = !!LoopManager.quantizeEnabled;
        this.quantCheckbox.onchange = () => {
            if (this.quantCheckbox.checked) {
                LoopManager.setQuantization(true, 0.03125);
            } else {
                LoopManager.setQuantization(false, null);
            }
            this.updateQuantUI();
        };

        this.quantSel = document.createElement('select');
        this.quantOptions.forEach(opt => {
            let op = document.createElement('option');
            op.value = opt.value;
            op.textContent = opt.label;
            if (opt.value === 0.03125) op.selected = true;
            this.quantSel.appendChild(op);
        });
        this.quantSel.disabled = !LoopManager.quantizeEnabled;
        this.quantSel.value = String(LoopManager.quantizeGrid || 0.03125);
        this.quantSel.onchange = () => {
            LoopManager.setQuantization(true, Number(this.quantSel.value));
            this.updateQuantUI();
        };

        this.controlsBar.append(
            this._label('Zoom X:'), this.zoomOutX, this.zoomInX,
            this._label('Zoom Y:'), this.zoomOutY, this.zoomInY,
            this._label('Quantize:'), this.quantCheckbox, this.quantSel
        );

        // --- SCROLLABLE WRAPPER ---
        this.scroller = document.createElement('div');
        Object.assign(this.scroller.style, {
            position: 'absolute', inset: 0, overflow: 'scroll',
            width: '100%', height: '100%', top: '42px'
        });
        this.rollGrid.appendChild(this.scroller);

        // --- MAIN FLEX LAYOUT ---
        this.mainRow = document.createElement('div');
        Object.assign(this.mainRow.style, {
            display: 'flex', flexDirection: 'row',
            alignItems: 'stretch', minHeight: '320px', minWidth: '800px', width: 'fit-content'
        });
        this.scroller.appendChild(this.mainRow);

        // --- KEY LABELS COLUMN ---
        this.labelsCol = document.createElement('div');
        Object.assign(this.labelsCol.style, {
            display: 'flex', flexDirection: 'column-reverse',
            background: '#232323', borderRight: '2px solid #282828',
            position: 'sticky', left: 0, zIndex: 2,
            minWidth: '48px', width: '48px', userSelect: 'none'
        });
        this.mainRow.appendChild(this.labelsCol);

        // --- GRID WRAPPER ---
        this.gridWrap = document.createElement('div');
        Object.assign(this.gridWrap.style, {
            position: 'relative', flex: 1,
            minWidth: '760px', minHeight: '1584px',
            width: 'fit-content', height: 'fit-content', background: 'transparent'
        });
        this.mainRow.appendChild(this.gridWrap);

        // Key labels (88 keys)
        for (let midi = this.MIDI_LOW; midi <= this.MIDI_HIGH; ++midi) {
            const noteName = window.Tone ? Tone.Frequency(midi, "midi").toNote() : midi;
            const label = document.createElement('div');
            label.textContent = noteName;
            Object.assign(label.style, {
                height: (18 * this.zoomY) + 'px',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '8px', fontWeight: (midi % 12 === 0) ? 'bold' : 'normal',
                color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: (this.isBlackKey(midi) ? '#18181c' : 'transparent'),
                borderBottom: '1px solid #23232a', fontSize: '13px',
            });
            this.labelsCol.appendChild(label);
        }

        // Keyboard shortcuts for delete
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

    updateQuantUI() {
        // Sync quant controls to LoopManager
        this.quantCheckbox.checked = !!LoopManager.quantizeEnabled;
        this.quantSel.disabled = !LoopManager.quantizeEnabled;
        this.quantSel.value = String(LoopManager.quantizeGrid != null ? LoopManager.quantizeGrid : 0.03125);
        this.draw();
    },

    setZoomX(val) {
        this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val));
        this.draw();
    },
    setZoomY(val) {
        this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val));
        this._resizeKeyLabels();
        this.draw();
    },

    _resizeKeyLabels() {
        Array.from(this.labelsCol.children).forEach(l => {
            l.style.height = (18 * this.zoomY) + 'px';
        });
    },

    draw() {
        const seq = synthApp.seq || [];
        // Use quantGrid only if enabled
        const quantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
        const gridTimeCount = quantGrid
            ? Math.ceil(timeMax / quantGrid) * quantGrid
            : Math.ceil(timeMax / 0.25) * 0.25; // fallback 1/16 for grid sizing if quant off
        const gridPitchCount = this.MIDI_HIGH - this.MIDI_LOW + 1;
        const cellW = 40 * this.zoomX, cellH = 18 * this.zoomY;
        this.gridWrap.innerHTML = '';

        // Quantization vertical lines + bar highlights
        if (quantGrid) {
            for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                const bar = (Math.round(t / 4) * 4 === t);
                const line = document.createElement('div');
                Object.assign(line.style, {
                    position: 'absolute', top: 0, left: (t * cellW) + 'px',
                    width: bar ? '2px' : '1px', height: (cellH * gridPitchCount) + 'px',
                    background: bar ? '#444' : '#292b2e', opacity: bar ? 0.6 : 0.22,
                    pointerEvents: 'none', zIndex: 1
                });
                this.gridWrap.appendChild(line);
                if (bar && t !== 0) {
                    let lbl = document.createElement('div');
                    lbl.textContent = `Bar ${Math.floor(t / 4) + 1}`;
                    Object.assign(lbl.style, {
                        position: 'absolute', top: '-18px', left: (t * cellW) + 2 + 'px',
                        fontSize: '12px', color: '#555', zIndex: 10
                    });
                    this.gridWrap.appendChild(lbl);
                }
            }
        }

        // Horizontal pitch lines
        for (let i = 0; i <= gridPitchCount; ++i) {
            const line = document.createElement('div');
            Object.assign(line.style, {
                position: 'absolute', left: 0, width: (cellW * gridTimeCount) + 'px',
                top: (i * cellH) + 'px', height: '1px',
                background: (i + this.MIDI_LOW) % 12 === 0 ? '#444' : '#292b2e',
                opacity: (i + this.MIDI_LOW) % 12 === 0 ? 0.55 : 0.22, pointerEvents: 'none', zIndex: 1
            });
            this.gridWrap.appendChild(line);
        }

        // Black key backgrounds
        for (let i = 0; i < gridPitchCount; ++i) {
            const midi = this.MIDI_HIGH - i;
            if (this.isBlackKey(midi)) {
                const bg = document.createElement('div');
                Object.assign(bg.style, {
                    position: 'absolute', left: 0, top: (i * cellH) + 'px',
                    width: (cellW * gridTimeCount) + 'px', height: cellH + 'px',
                    background: '#1c1c22', opacity: 0.46, zIndex: 0, pointerEvents: 'none'
                });
                this.gridWrap.appendChild(bg);
            }
        }

        Object.assign(this.gridWrap.style, {
            width: (cellW * gridTimeCount) + 'px',
            height: (cellH * gridPitchCount) + 'px'
        });

        // --- Draw notes (interactive) ---
        let dragData = null, dragNoteIndex = null, lastPreviewMidi = null;
        const playPreview = midi => {
            if (!window.synthApp.synth) return;
            window.synthApp.synth.triggerAttackRelease(
                Tone.Frequency(midi, "midi").toNote(), 0.3, undefined, 0.9
            );
        };

        seq.forEach((o, i) => {
            const midi = Tone.Frequency(o.note).toMidi();
            const y = (this.MIDI_HIGH - midi) * cellH;
            const x = o.start * cellW;
            const w = o.dur * cellW;
            const noteDiv = document.createElement('div');
            Object.assign(noteDiv.style, {
                position: 'absolute', top: y + 'px', left: x + 'px',
                width: w + 'px', height: cellH + 'px',
                background: '#bb86fc', borderRadius: '4px', boxShadow: '0 2px 8px #0004',
                opacity: o.vel, outline: synthApp.selNote === i ? '2px solid #03dac6' : '',
                zIndex: 10, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '2px', fontWeight: 'bold', color: '#232323'
            });
            noteDiv.dataset.idx = i; noteDiv.tabIndex = 0;
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
                dragData = { i, startX: e.clientX, startY: e.clientY, origStart: o.start, origMidi: midi };
                dragNoteIndex = i; lastPreviewMidi = midi;
                document.body.style.cursor = 'move';
            };
            noteDiv.className = 'roll-note';
            this.gridWrap.appendChild(noteDiv);
        });

        // Note dragging (snap only if quantize enabled)
        const onMove = (e) => {
            if (!dragData || dragNoteIndex === null) return;
            let note = seq[dragNoteIndex];
            let dx = (e.clientX - dragData.startX);
            let dy = (e.clientY - dragData.startY);
            let dt = dx / (40 * this.zoomX);
            if (quantGrid) {
                dt = Math.round((dragData.origStart + dt) / quantGrid) * quantGrid;
            } else {
                dt = dragData.origStart + dt;
            }
            note.start = Math.max(0, Math.round(dt * 1000) / 1000);
            let dpitch = -Math.round(dy / (18 * this.zoomY));
            let newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, dragData.origMidi + dpitch));
            if (note.note !== Tone.Frequency(newMidi, "midi").toNote()) {
                note.note = Tone.Frequency(newMidi, "midi").toNote();
                if (lastPreviewMidi !== newMidi) {
                    playPreview(newMidi); lastPreviewMidi = newMidi;
                }
            }
            this.draw();
        };
        const onUp = () => {
            dragData = null; dragNoteIndex = null; lastPreviewMidi = null;
            document.body.style.cursor = '';
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

        // Live playhead
        if (synthApp.isPlaying) {
            this._drawPlayhead(synthApp.currentTime || 0, cellW, gridPitchCount, cellH);
            if (!this.transportInterval) {
                this.transportInterval = setInterval(() => {
                    this._drawPlayhead(synthApp.currentTime || 0, cellW, gridPitchCount, cellH);
                }, 33);
            }
        } else if (this.transportInterval) {
            clearInterval(this.transportInterval);
            this.transportInterval = null;
        }
    },

    _drawPlayhead(playTime, cellW, gridPitchCount, cellH) {
        if (!this.gridWrap) return;
        let ph = this.gridWrap.querySelector('.playhead');
        if (!ph) {
            ph = document.createElement('div');
            ph.className = 'playhead';
            Object.assign(ph.style, {
                position: 'absolute', top: 0,
                width: '3px', height: (cellH * gridPitchCount) + 'px',
                background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                opacity: 0.9, zIndex: 99, pointerEvents: 'none'
            });
            this.gridWrap.appendChild(ph);
        }
        ph.style.left = (playTime * cellW) + 'px';
    },

    _btn(txt, onClick, title = '') {
        const btn = document.createElement('button');
        btn.textContent = txt;
        btn.title = title;
        Object.assign(btn.style, {
            background: '#272733', color: '#fff',
            border: '1px solid #363645', borderRadius: '5px',
            padding: '3px 10px', margin: '0 2px', cursor: 'pointer',
            fontSize: '13px', fontWeight: 'bold', outline: 'none',
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
        Object.assign(span.style, { margin: '0 4px', color: '#aaa', fontSize: '13px' });
        return span;
    },

    isBlackKey(midi) { return [1, 3, 6, 8, 10].includes(midi % 12); }
};
