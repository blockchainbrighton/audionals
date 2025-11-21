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
    playheadRaf = null; dragData = null; dragNoteIndex = null; lastPreviewMidi = null; _keyListener = null;
    quantizeEnabled = false; quantizeGrid = 0.25; Tone = null;
    cellWidth = 40;
    _pendingCenterMidi = null;
    quantizeToggle = null; quantizeSelect = null; transportInfo = null;
    QUANTIZE_OPTIONS = [
        { key: 'whole', label: '1/1' },
        { key: 'half', label: '1/2' },
        { key: 'quarter', label: '1/4' },
        { key: 'eighth', label: '1/8' },
        { key: 'sixteenth', label: '1/16' },
        { key: 'thirtysecond', label: '1/32' }
    ];
    loopEnabled = false; loopStart = 0; loopEnd = 0;
    sequenceLength = 0;
    _playbackTransportBase = 0;

    constructor(containerElement, eventBus, state) {
        this.rollGrid = containerElement;
        this.eventBus = eventBus;
        this.state = state;
        if (!this.rollGrid) { console.warn('[PianoRoll] Cannot initialize; no container.'); return; }
        this._boundDragMove = this.#onGlobalDragMove.bind(this);
        this._boundDragUp = this.#onGlobalDragUp.bind(this);
        this._dragHandlersAttached = false;
        this.init();
    }

    init() { this.#createUI(); this.#setupEventListeners(); this.draw(); }

    #createUI() {
        this.rollGrid.innerHTML = '';
        const desiredHeight = this.rollGrid.dataset?.pianoHeight || '60vh';
        const desiredMinHeight = this.rollGrid.dataset?.pianoMinHeight || '280px';
        const desiredMaxHeight = this.rollGrid.dataset?.pianoMaxHeight || '600px';
        Object.assign(this.rollGrid.style, {
            position: 'relative', background: '#181a1b', width: '100%',
            height: desiredHeight, minHeight: desiredMinHeight, maxHeight: desiredMaxHeight,
            display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px', userSelect: 'none', overflow: 'hidden'
        });
        // Controls Bar
        const bar = this.#div({
            display: 'flex', gap: '14px', alignItems: 'center', background: '#212126',
            borderBottom: '2px solid #29292d', padding: '8px 12px', position: 'sticky',
            top: 0, zIndex: 30, minHeight: '36px', flexWrap: 'wrap'
        });

        const zoomGroup = this.#div({ display: 'flex', alignItems: 'center', gap: '8px' });
        zoomGroup.append(
            this.#label('Zoom X:'), this.#btn('-', () => this.setZoomX(this.zoomX / 1.3)), this.#btn('+', () => this.setZoomX(this.zoomX * 1.3)),
            this.#label('Zoom Y:'), this.#btn('–', () => this.setZoomY(this.zoomY / 1.15)), this.#btn('∣∣', () => this.setZoomY(this.zoomY * 1.15))
        );

        const quantizeGroup = this.#div({ display: 'flex', alignItems: 'center', gap: '8px' });
        const quantizeLabel = this.#label('Quantize:');
        quantizeLabel.style.marginLeft = '12px';
        this.quantizeToggle = document.createElement('input');
        this.quantizeToggle.type = 'checkbox';
        this.quantizeToggle.title = 'Enable quantization';
        this.quantizeToggle.addEventListener('change', () => {
            this.quantizeEnabled = this.quantizeToggle.checked;
            this.draw();
            this.eventBus.dispatchEvent(new CustomEvent('quantize-toggle', {
                detail: { enabled: this.quantizeToggle.checked }
            }));
        });
        this.quantizeSelect = document.createElement('select');
        this.quantizeSelect.style.background = '#1f2026';
        this.quantizeSelect.style.color = '#fff';
        this.quantizeSelect.style.border = '1px solid #32333d';
        this.quantizeSelect.style.borderRadius = '4px';
        this.quantizeSelect.style.padding = '2px 6px';
        this.quantizeSelect.style.fontSize = '13px';
        this.QUANTIZE_OPTIONS.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.key;
            option.textContent = opt.label;
            this.quantizeSelect.appendChild(option);
        });
        this.quantizeSelect.addEventListener('change', () => {
            const value = this.#gridValueFromKey(this.quantizeSelect.value);
            if (Number.isFinite(value)) {
                this.quantizeGrid = value;
                this.draw();
            }
            this.eventBus.dispatchEvent(new CustomEvent('quantize-grid-set', {
                detail: { gridKey: this.quantizeSelect.value }
            }));
        });
        quantizeGroup.append(quantizeLabel, this.quantizeToggle, this.quantizeSelect);

        this.transportInfo = this.#div({
            marginLeft: 'auto', color: '#9bd8ff', fontSize: '13px', fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace'
        }, 'Transport: 00:00');

        bar.append(zoomGroup, quantizeGroup, this.transportInfo);
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

        this.#syncQuantizeControls();
        this.#attachGlobalDragHandlers();
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
        this.eventBus.addEventListener('loop-state-update', e => {
            const detail = e.detail || {};
            if (typeof detail.quantizeEnabled === 'boolean') this.quantizeEnabled = detail.quantizeEnabled;
            if (typeof detail.quantizeGridValue === 'number') this.quantizeGrid = detail.quantizeGridValue;
            if (typeof detail.start === 'number') this.loopStart = detail.start;
            if (typeof detail.end === 'number') this.loopEnd = detail.end;
            this.loopEnabled = !!detail.enabled;
            this.#syncQuantizeControls();
            this.draw();
        });
        this.eventBus.addEventListener('loop-bounds-changed', e => {
            if (typeof e.detail?.start === 'number') this.loopStart = e.detail.start;
            if (typeof e.detail?.end === 'number') this.loopEnd = e.detail.end;
        });
        this.eventBus.addEventListener('quantization-grid-changed', e => {
            if (typeof e.detail?.gridValue === 'number') {
                this.quantizeGrid = e.detail.gridValue;
                this.#syncQuantizeControls();
                this.draw();
            }
        });
        // Playback animation
        this.eventBus.addEventListener('recording-state-changed', e => {
            const wasPlaying = this.state.isPlaying;
            this.state.isPlaying = e.detail.isPlaying;
            if (e.detail.isPlaying && !wasPlaying) {
                const Tone = this.Tone || window.Tone;
                if (!Number.isFinite(this._playbackTransportBase) || this._playbackTransportBase === 0) {
                    this._playbackTransportBase = Tone?.Transport?.seconds ?? 0;
                }
                this.startPlayheadAnimation();
            } else if (!e.detail.isPlaying && wasPlaying) {
                this._playbackTransportBase = 0;
                this.stopPlayheadAnimation();
            }
        });
        // Tone.js ready
        this.eventBus.addEventListener('tone-ready', e => { this.Tone = e.detail.Tone; this.draw(); });
        this.eventBus.addEventListener('playback-started', e => {
            const Tone = this.Tone || window.Tone;
            if (typeof e.detail?.transportStart === 'number') {
                this._playbackTransportBase = e.detail.transportStart;
            } else {
                this._playbackTransportBase = Tone?.Transport?.seconds ?? this._playbackTransportBase;
            }
            if (!this.state.isPlaying) {
                this.startPlayheadAnimation();
            }
        });
        this.eventBus.addEventListener('playback-stopped', () => {
            this._playbackTransportBase = 0;
        });
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
        const actualSequenceLength = seq.length ? Math.max(...seq.map(o => o.start + o.dur)) : 0;
        this.sequenceLength = actualSequenceLength;
        const timeMax = Math.max(16, actualSequenceLength);
        const gridTimeCount = quantGrid ? Math.ceil(timeMax / quantGrid) * quantGrid : Math.ceil(timeMax / 0.25) * 0.25;
        const cellW = 40 * this.zoomX, cellH = this.CELL_H * this.zoomY;
        this.cellWidth = cellW;
        this.sequenceDuration = gridTimeCount;
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
        this.updatePlayhead();
        if (Number.isFinite(this._pendingCenterMidi)) {
            requestAnimationFrame(() => this.#applyPendingCenter({ force: true }));
        }
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

    #attachGlobalDragHandlers() {
        if (this._dragHandlersAttached) return;
        document.addEventListener('mousemove', this._boundDragMove);
        document.addEventListener('mouseup', this._boundDragUp);
        this._dragHandlersAttached = true;
    }

    #onGlobalDragMove(e) {
        if (!this.dragData || this.dragNoteIndex === null) return;
        const Tone = this.Tone || window.Tone;
        if (!Tone) return;

        const cellW = this.cellWidth || 40 * this.zoomX;
        const note = this.state.seq[this.dragNoteIndex];
        const dx = e.clientX - this.dragData.startX;
        const dy = e.clientY - this.dragData.startY;
        const dt = dx / cellW;
        const currentQuant = this.quantizeEnabled ? this.quantizeGrid : null;
        const newStart = this.dragData.origStart + dt;
        note.start = Math.max(0, currentQuant ? Math.round(newStart / currentQuant) * currentQuant : newStart);

        const dpitch = -Math.round(dy / (this.CELL_H * this.zoomY));
        const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, this.dragData.origMidi + dpitch));
        note.note = Tone.Frequency(newMidi, 'midi').toNote();

        if (this.lastPreviewMidi !== newMidi) {
            this.eventBus.dispatchEvent(new CustomEvent('note-preview', {
                detail: { note: note.note, duration: 0.3, velocity: 0.9 }
            }));
            this.lastPreviewMidi = newMidi;
        }

        this.draw();
    }

    #onGlobalDragUp() {
        if (this.dragNoteIndex !== null) {
            this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                detail: { noteIndex: this.dragNoteIndex, note: this.state.seq[this.dragNoteIndex] }
            }));
            this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        }

        this.dragData = null;
        this.dragNoteIndex = null;
        this.lastPreviewMidi = null;
        document.body.style.cursor = '';
    }

    startPlayheadAnimation() {
        if (this.playheadRaf) return;
        const tick = () => {
            this.updatePlayhead();
            this.playheadRaf = requestAnimationFrame(tick);
        };
        this.playheadRaf = requestAnimationFrame(tick);
    }
    stopPlayheadAnimation() {
        if (this.playheadRaf) {
            cancelAnimationFrame(this.playheadRaf);
            this.playheadRaf = null;
        }
        const oldPh = this.scrollContainer?.querySelector('.playhead'); if (oldPh) oldPh.remove();
        if (this.transportInfo) this.transportInfo.textContent = 'Transport: 00:00';
    }
    updatePlayhead() {
        if (!this.innerContent || !this.scrollContainer) return;
        const Tone = this.Tone || window.Tone; if (!Tone) return;
        const transportSeconds = Tone.Transport.seconds;
        const elapsed = Math.max(0, transportSeconds - this._playbackTransportBase);
        const loopStart = Number.isFinite(this.loopStart) ? this.loopStart : 0;
        const loopEnd = Number.isFinite(this.loopEnd) ? this.loopEnd : loopStart;
        const loopLength = Math.max(loopEnd - loopStart, 0);

        let displayTime = elapsed;
        if (this.loopEnabled && loopLength > 0.0001) {
            const relative = elapsed % loopLength;
            const safeRelative = relative < 0 ? relative + loopLength : relative;
            displayTime = loopStart + safeRelative;
        } else if (!this.loopEnabled && this.sequenceLength > 0 && elapsed >= this.sequenceLength) {
            const relative = elapsed % this.sequenceLength;
            displayTime = relative < 0 ? relative + this.sequenceLength : relative;
        }

        if (this.transportInfo) {
            const pos = Tone.Transport.position;
            this.transportInfo.textContent = `Transport: ${this.#formatTransport(displayTime)} • ${pos ?? '0:0:0'}`;
        }
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
        ph.style.left = `${displayTime * this.cellWidth + 48}px`;
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

    #syncQuantizeControls() {
        if (this.quantizeToggle) this.quantizeToggle.checked = !!this.quantizeEnabled;
        if (this.quantizeSelect) {
            const gridKey = this.#gridKeyFromValue(this.quantizeGrid);
            if (this.quantizeSelect.value !== gridKey) {
                this.quantizeSelect.value = gridKey;
            }
        }
    }

    #gridKeyFromValue(value) {
        if (value === 4) return 'whole';
        if (value === 2) return 'half';
        if (value === 1) return 'quarter';
        if (value === 0.5) return 'eighth';
        if (value === 0.25) return 'sixteenth';
        return 'thirtysecond';
    }

    #gridValueFromKey(key) {
        switch (key) {
            case 'whole': return 4;
            case 'half': return 2;
            case 'quarter': return 1;
            case 'eighth': return 0.5;
            case 'sixteenth': return 0.25;
            default: return 0.125;
        }
    }

    #formatTransport(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    centerOnMidi(midiValue, { immediate = false } = {}) {
        if (!Number.isFinite(midiValue)) return;
        this._pendingCenterMidi = midiValue;
        if (immediate) {
            this.#applyPendingCenter({ force: true });
        } else {
            requestAnimationFrame(() => this.#applyPendingCenter());
        }
    }

    #applyPendingCenter({ force = false } = {}) {
        if (!Number.isFinite(this._pendingCenterMidi) || !this.scrollContainer) return;
        if (!this.scrollContainer.clientHeight) {
            requestAnimationFrame(() => this.#applyPendingCenter({ force }));
            return;
        }
        const midi = this._pendingCenterMidi;
        const clamped = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, Math.round(midi)));
        const rowHeight = this.CELL_H * this.zoomY;
        const rowIndex = this.MIDI_HIGH - clamped;
        const desiredCenter = (rowIndex + 0.5) * rowHeight;
        const targetScroll = Math.max(0, desiredCenter - (this.scrollContainer.clientHeight || 0) / 2);
        this.scrollContainer.scrollTop = targetScroll;
        this._pendingCenterMidi = null;
    }

    destroy() {
        this.stopPlayheadAnimation();
        if (this._keyListener) { document.removeEventListener("keydown", this._keyListener); this._keyListener = null; }
        if (this._dragHandlersAttached) {
            document.removeEventListener('mousemove', this._boundDragMove);
            document.removeEventListener('mouseup', this._boundDragUp);
            this._dragHandlersAttached = false;
        }
        if (this.rollGrid) this.rollGrid.innerHTML = '';
    }
}

export default PianoRoll;
