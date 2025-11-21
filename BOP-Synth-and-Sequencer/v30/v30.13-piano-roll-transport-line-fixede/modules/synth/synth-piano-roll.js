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
    playheadRaf = null; dragData = null; lastPreviewMidi = null; _keyListener = null;
    quantizeEnabled = false; quantizeGrid = 0.25; Tone = null;
    cellWidth = 40;
    _pendingCenterMidi = null;
    quantizeToggle = null; quantizeSelect = null; transportInfo = null;
    DEFAULT_SEQUENCE_STEPS = 64;
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
    _playbackTransportReference = 0;
    _zoomXUserOverride = false;
    _autoZoomDirty = true;
    _lastSequenceSignature = null;

    constructor(containerElement, eventBus, state) {
        this.rollGrid = containerElement;
        this.eventBus = eventBus;
        this.state = state;
        if (!this.rollGrid) { console.warn('[PianoRoll] Cannot initialize; no container.'); return; }
        this._boundDragMove = this.#onGlobalDragMove.bind(this);
        this._boundDragUp = this.#onGlobalDragUp.bind(this);
        this._boundResize = () => {
            if (this._zoomXUserOverride) return;
            this._autoZoomDirty = true;
            this.draw();
        };
        this._dragHandlersAttached = false;
        this.selectedNotes = new Set();
        this.clipboard = [];
        this.selectionRect = null;
        this.selectionDrag = null;
        this.velocitySlider = null;
        this.velocityValue = null;
        this._suppressClick = false;
        this._altPressed = false;
        this._shiftPressed = false;
        this.cursorMode = 'move';
        this.isDragging = false;
        this._keyListenersAttached = false;
        this._boundKeyDown = this.#handleGlobalKeyDown.bind(this);
        this._boundKeyUp = this.#handleGlobalKeyUp.bind(this);
        this.currentBpm = (this.state?.seqMeta?.recordBpm) || 120;
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
        const zoomOutX = this.#btn('-', () => this.setZoomX(this.zoomX / 1.3, { user: true }));
        const zoomInX = this.#btn('+', () => this.setZoomX(this.zoomX * 1.3, { user: true }));
        const fitX = this.#btn('Fit', () => {
            this._zoomXUserOverride = false;
            this._autoZoomDirty = true;
            this.draw();
        });
        fitX.title = 'Fit the full sequence into the visible width';
        zoomGroup.append(
            this.#label('Zoom X:'), zoomOutX, zoomInX, fitX,
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

        const toolsGroup = this.#createToolControls();

        this.transportInfo = this.#div({
            marginLeft: 'auto', color: '#9bd8ff', fontSize: '13px', fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace'
        }, 'Transport: 00:00');

        bar.append(zoomGroup, quantizeGroup, toolsGroup, this.transportInfo);
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
        this.scrollContainer.addEventListener('mousedown', this.#onBackgroundPointerDown.bind(this));

        if (!this._keyListenersAttached) {
            document.addEventListener('keydown', this._boundKeyDown);
            document.addEventListener('keyup', this._boundKeyUp);
            this._keyListenersAttached = true;
        }
        window.addEventListener('resize', this._boundResize);

        this.#updateVelocityControls();
        this.#syncQuantizeControls();
        this.#attachGlobalDragHandlers();
        this.#updateCursorVisual();
    }

    #createToolControls() {
        const group = this.#div({ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' });

        const selectAllBtn = this.#btn('Select All', () => this.#selectAllNotes());
        selectAllBtn.title = 'Select every note in the sequence';

        const clearBtn = this.#btn('Clear', () => this.#clearSelection());
        clearBtn.title = 'Deselect all notes';

        const quantizeBtn = this.#btn('Quantize', () => this.#quantizeSelection());
        quantizeBtn.title = 'Snap the selected notes to the active grid';

        const duplicateBtn = this.#btn('Duplicate', () => this.#duplicateSelection());
        duplicateBtn.title = 'Copy selection forward by one grid length';

        const copyBtn = this.#btn('Copy', () => this.#copySelection());
        copyBtn.title = 'Copy selected notes';

        const pasteBtn = this.#btn('Paste', () => this.#pasteSelection());
        pasteBtn.title = 'Paste previously copied notes at the playhead';

        const deleteBtn = this.#btn('Delete', () => this.#deleteSelection());
        deleteBtn.title = 'Delete selected notes';

        const velocityWrap = this.#div({ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' });
        const velocityLabel = this.#label('Velocity:');
        this.velocitySlider = document.createElement('input');
        this.velocitySlider.type = 'range';
        this.velocitySlider.min = '0';
        this.velocitySlider.max = '1';
        this.velocitySlider.step = '0.01';
        this.velocitySlider.value = '1';
        this.velocitySlider.disabled = true;
        this.velocitySlider.style.width = '120px';
        this.velocitySlider.addEventListener('input', () => this.#applyVelocityToSelection(parseFloat(this.velocitySlider.value)));
        this.velocitySlider.addEventListener('change', () => this.#applyVelocityToSelection(parseFloat(this.velocitySlider.value)));
        this.velocityValue = this.#label('100%');
        velocityWrap.append(velocityLabel, this.velocitySlider, this.velocityValue);

        group.append(selectAllBtn, clearBtn, quantizeBtn, duplicateBtn, copyBtn, pasteBtn, deleteBtn, velocityWrap);
        return group;
    }

    #generateNoteId(noteObj = {}) {
        const base = noteObj.note || 'note';
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        return `${base}_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    #ensureNoteId(noteObj) {
        if (!noteObj) return null;
        if (!noteObj.id) {
            noteObj.id = this.#generateNoteId(noteObj);
        }
        return noteObj.id;
    }

    #getNoteIndexById(id) {
        if (!id) return -1;
        const seq = this.state.seq || [];
        for (let i = 0; i < seq.length; i++) {
            if (this.#ensureNoteId(seq[i]) === id) return i;
        }
        return -1;
    }

    #getSelectedNotes() {
        const seq = this.state.seq || [];
        if (!seq.length || !this.selectedNotes.size) return [];
        return seq.filter(note => this.selectedNotes.has(this.#ensureNoteId(note)));
    }

    #pruneSelection() {
        if (!this.selectedNotes.size) return;
        const seq = this.state.seq || [];
        const validIds = new Set(seq.map(n => this.#ensureNoteId(n)));
        let mutated = false;
        this.selectedNotes.forEach(id => {
            if (!validIds.has(id)) {
                this.selectedNotes.delete(id);
                mutated = true;
            }
        });
        if (mutated) this.#onSelectionChanged({ emit: false });
    }

    #selectAllNotes() {
        const seq = this.state.seq || [];
        this.selectedNotes.clear();
        seq.forEach(note => this.selectedNotes.add(this.#ensureNoteId(note)));
        this.#onSelectionChanged();
        this.draw();
    }

    #clearSelection({ redraw = true } = {}) {
        if (!this.selectedNotes.size) return;
        this.selectedNotes.clear();
        this.state.selNote = null;
        this.#onSelectionChanged();
        if (redraw) this.draw();
    }

    #onSelectionChanged({ emit = true } = {}) {
        const selected = this.#getSelectedNotes();
        if (selected.length) {
            const firstId = this.#ensureNoteId(selected[0]);
            this.state.selNote = this.#getNoteIndexById(firstId);
            if (emit) {
                this.eventBus.dispatchEvent(new CustomEvent('note-selected', {
                    detail: {
                        noteIndex: this.state.selNote,
                        note: selected[0],
                        selection: selected.map(note => ({ id: this.#ensureNoteId(note), note }))
                    }
                }));
            }
        } else {
            this.state.selNote = null;
            if (emit) this.eventBus.dispatchEvent(new CustomEvent('note-deselected'));
        }
        this.#updateVelocityControls();
    }

    #updateVelocityControls() {
        if (!this.velocitySlider || !this.velocityValue) return;
        const selected = this.#getSelectedNotes();
        if (!selected.length) {
            this.velocitySlider.disabled = true;
            this.velocitySlider.value = '1';
            this.velocityValue.textContent = '--';
            return;
        }
        const avg = selected.reduce((sum, note) => sum + (Number(note.vel) || 0), 0) / selected.length;
        const clamped = Math.max(0, Math.min(1, avg));
        this.velocitySlider.disabled = false;
        this.velocitySlider.value = clamped.toFixed(2);
        this.velocityValue.textContent = `${Math.round(clamped * 100)}%`;
    }

    #copySelection() {
        const selected = this.#getSelectedNotes();
        if (!selected.length) return;
        const base = Math.min(...selected.map(n => n.start || 0));
        this.clipboard = selected.map(note => {
            const clone = {
                note: note.note,
                start: (note.start || 0) - base,
                dur: note.dur || 0,
                vel: note.vel ?? 1
            };
            return clone;
        });
    }

    #pasteSelection({ referenceOffset = null } = {}) {
        if (!this.clipboard.length) return;
        const seq = this.state.seq || [];
        const selected = this.#getSelectedNotes();
        const gridSeconds = this.quantizeEnabled ? this.#gridSeconds() : this.#defaultStepSeconds();
        const reference = Number.isFinite(referenceOffset)
            ? referenceOffset
            : (selected.length
                ? Math.max(...selected.map(note => (note.start || 0) + (note.dur || 0))) + gridSeconds
                : (this.sequenceLength || 0) + gridSeconds);
        const newIds = [];
        this.clipboard.forEach(item => {
            const clone = {
                id: this.#generateNoteId(item),
                note: item.note,
                start: Math.max(0, reference + (item.start || 0)),
                dur: Math.max(grid, item.dur || grid),
                vel: Math.max(0, Math.min(1, item.vel ?? 1))
            };
            seq.push(clone);
            newIds.push(clone.id);
        });
        this.#sortSequenceByStart();
        this.selectedNotes = new Set(newIds);
        this.#onSelectionChanged();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        this.draw();
    }

    #duplicateSelection() {
        const selected = this.#getSelectedNotes();
        if (!selected.length) return;
        this.#copySelection();
        const gridSeconds = this.quantizeEnabled ? this.#gridSeconds() : this.#defaultStepSeconds();
        const offset = Math.max(...selected.map(note => (note.start || 0) + (note.dur || 0))) + gridSeconds;
        this.#pasteSelection({ referenceOffset: offset });
    }

    #quantizeSelection() {
        const selected = this.#getSelectedNotes();
        if (!selected.length) return;
        const gridSeconds = this.#gridSeconds();
        const Tone = this.Tone || window.Tone;
        selected.forEach(note => {
            note.start = Math.max(0, Math.round((note.start || 0) / gridSeconds) * gridSeconds);
            note.dur = Math.max(gridSeconds, Math.round((note.dur || gridSeconds) / gridSeconds) * gridSeconds);
            if (Tone && typeof note.note === 'string') {
                // nothing extra; keep pitch
            }
            const idx = this.#getNoteIndexById(this.#ensureNoteId(note));
            if (idx >= 0) {
                this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                    detail: { noteIndex: idx, note }
                }));
            }
        });
        this.#sortSequenceByStart();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        this.draw();
    }

    #deleteSelection() {
        if (!this.selectedNotes.size) return;
        const seq = this.state.seq || [];
        for (let i = seq.length - 1; i >= 0; i--) {
            if (this.selectedNotes.has(this.#ensureNoteId(seq[i]))) {
                seq.splice(i, 1);
            }
        }
        this.selectedNotes.clear();
        this.state.selNote = null;
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        this.#onSelectionChanged();
        this.draw();
    }

    #applyVelocityToSelection(value) {
        if (!this.selectedNotes.size || !Number.isFinite(value)) return;
        const clamped = Math.max(0, Math.min(1, value));
        const seq = this.state.seq || [];
        seq.forEach((note, index) => {
            if (this.selectedNotes.has(this.#ensureNoteId(note))) {
                note.vel = clamped;
                this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                    detail: { noteIndex: index, note }
                }));
            }
        });
        this.#updateVelocityControls();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        this.draw();
    }

    #getEffectiveBpm() {
        if (Number.isFinite(this.currentBpm)) return this.currentBpm;
        if (Number.isFinite(this.state?.seqMeta?.recordBpm)) return this.state.seqMeta.recordBpm;
        return 120;
    }

    #secondsPerBeat() {
        const bpm = this.#getEffectiveBpm();
        return 60 / Math.max(1e-6, bpm);
    }

    #gridSeconds(fraction = this.quantizeGrid) {
        const frac = Number.isFinite(fraction) ? fraction : 0.25;
        return frac * this.#secondsPerBeat();
    }

    #defaultStepSeconds() {
        return 0.25 * this.#secondsPerBeat();
    }

    #onBackgroundPointerDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.roll-note')) return;
        const rect = this.scrollContainer.getBoundingClientRect();
        const additive = e.shiftKey || e.metaKey || e.ctrlKey;

        const scrollLeft = this.scrollContainer.scrollLeft;
        const scrollTop = this.scrollContainer.scrollTop;

        this.selectionDrag = {
            additive,
            initialSelection: new Set(this.selectedNotes),
            startClientX: e.clientX,
            startClientY: e.clientY,
            currentClientX: e.clientX,
            currentClientY: e.clientY,
            containerRect: rect,
            startContentX: e.clientX - rect.left + scrollLeft,
            startContentY: e.clientY - rect.top + scrollTop,
            currentContentX: e.clientX - rect.left + scrollLeft,
            currentContentY: e.clientY - rect.top + scrollTop
        };

        if (!additive) {
            this.selectedNotes.clear();
            this.#onSelectionChanged({ emit: false });
        }

        if (!this.selectionRect) {
            this.selectionRect = this.#div({
                position: 'absolute',
                border: '1px dashed #03dac6',
                background: 'rgba(3, 218, 198, 0.18)',
                pointerEvents: 'none',
                zIndex: 50
            });
            this.scrollContainer.appendChild(this.selectionRect);
        }
        this.selectionRect.style.display = 'block';
        this.selectionRect.style.left = '0px';
        this.selectionRect.style.top = '0px';
        this.selectionRect.style.width = '0px';
        this.selectionRect.style.height = '0px';
    }

    #updateSelectionDragBox(e) {
        if (!this.selectionDrag || !this.selectionRect) return;
        this.selectionDrag.currentClientX = e.clientX;
        this.selectionDrag.currentClientY = e.clientY;
        const rect = this.selectionDrag.containerRect;
        const scrollLeft = this.scrollContainer.scrollLeft;
        const scrollTop = this.scrollContainer.scrollTop;

        const startContentX = this.selectionDrag.startClientX - rect.left + scrollLeft;
        const currentContentX = e.clientX - rect.left + scrollLeft;
        const startContentY = this.selectionDrag.startClientY - rect.top + scrollTop;
        const currentContentY = e.clientY - rect.top + scrollTop;

        this.selectionDrag.startContentX = startContentX;
        this.selectionDrag.currentContentX = currentContentX;
        this.selectionDrag.startContentY = startContentY;
        this.selectionDrag.currentContentY = currentContentY;

        const left = Math.min(startContentX, currentContentX) - scrollLeft;
        const top = Math.min(startContentY, currentContentY) - scrollTop;
        const width = Math.abs(currentContentX - startContentX);
        const height = Math.abs(currentContentY - startContentY);

        this.selectionRect.style.left = `${left}px`;
        this.selectionRect.style.top = `${top}px`;
        this.selectionRect.style.width = `${width}px`;
        this.selectionRect.style.height = `${height}px`;
    }

    #finalizeSelectionDrag() {
        if (!this.selectionDrag) return;
        if (this.selectionRect) {
            this.selectionRect.remove();
            this.selectionRect = null;
        }

        const drag = this.selectionDrag;
        this.selectionDrag = null;

        const width = Math.abs((drag.currentContentX ?? drag.startContentX) - (drag.startContentX ?? 0));
        const height = Math.abs((drag.currentContentY ?? drag.startContentY) - (drag.startContentY ?? 0));

        if (width < 4 && height < 4) {
            if (drag.additive) {
                this.selectedNotes = drag.initialSelection;
                this.#onSelectionChanged({ emit: false });
                this.draw();
            } else {
                this.#clearSelection();
            }
            return;
        }

        const cellHeight = this.CELL_H * this.zoomY;
        const startX = Math.min(drag.startContentX, drag.currentContentX);
        const endX = Math.max(drag.startContentX, drag.currentContentX);
        const startY = Math.min(drag.startContentY, drag.currentContentY);
        const endY = Math.max(drag.startContentY, drag.currentContentY);

        const startTime = Math.max(0, (startX - 48) / this.cellWidth);
        const endTime = Math.max(0, (endX - 48) / this.cellWidth);
        const midiMax = this.MIDI_HIGH - Math.floor(startY / cellHeight);
        const midiMin = this.MIDI_HIGH - Math.floor(endY / cellHeight);

        const seq = this.state.seq || [];
        const Tone = this.Tone || window.Tone;
        const toMidi = note => {
            if (!Tone?.Frequency) return this.MIDI_LOW;
            try {
                return Tone.Frequency(note?.note ?? 'C4').toMidi();
            } catch {
                return this.MIDI_LOW;
            }
        };

        const newSelection = drag.additive ? new Set(drag.initialSelection) : new Set();

        seq.forEach(note => {
            const noteId = this.#ensureNoteId(note);
            const noteStart = note.start || 0;
            const noteEnd = noteStart + (note.dur || 0);
            const midi = toMidi(note);
            const overlapsTime = noteEnd >= startTime && noteStart <= endTime;
            const withinPitch = midi >= midiMin && midi <= midiMax;
            if (overlapsTime && withinPitch) {
                newSelection.add(noteId);
            }
        });

        this.selectedNotes = newSelection;
        this.#onSelectionChanged();
        this.eventBus.dispatchEvent(new CustomEvent('note-selection-changed', {
            detail: { selection: Array.from(this.selectedNotes) }
        }));
        this.draw();
    }

    #sortSequenceByStart() {
        const seq = this.state.seq || [];
        if (!seq.length) return;
        const Tone = this.Tone || window.Tone;
        const toMidi = note => {
            if (!Tone?.Frequency) return 0;
            try {
                return Tone.Frequency(note?.note ?? 'C4').toMidi();
            } catch (err) {
                return 0;
            }
        };
        seq.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            const midiA = toMidi(a);
            const midiB = toMidi(b);
            return midiA - midiB;
        });
    }

    #activateCloneDrag(event) {
        if (!this.dragData || this.dragData.cloned) return;
        const seq = this.state.seq || [];
        const clones = [];
        this.dragData.originalNotes.forEach(entry => {
            const baseNote = entry.note;
            const clone = {
                id: this.#generateNoteId(baseNote),
                note: baseNote.note,
                start: baseNote.start,
                dur: baseNote.dur || this.#defaultStepSeconds(),
                vel: baseNote.vel
            };
            seq.push(clone);
            clones.push({
                id: clone.id,
                note: clone,
                index: seq.length - 1,
                origStart: clone.start,
                origDur: clone.dur,
                origMidi: entry.origMidi
            });
        });
        this.dragData.notes = clones;
        this.dragData.cloned = true;
        this.dragData.copyMode = true;
        this.dragData.cloneIds = clones.map(c => c.id);
        this.selectedNotes = new Set(this.dragData.cloneIds);
        this.#onSelectionChanged({ emit: false });
        if (event?.clientX) this.dragData.startX = event.clientX;
    }

    #deactivateCloneDrag(event) {
        if (!this.dragData || !this.dragData.cloned) return;
        const seq = this.state.seq || [];
        const cloneIds = new Set(this.dragData.cloneIds || []);
        for (let i = seq.length - 1; i >= 0; i--) {
            const note = seq[i];
            const id = this.#ensureNoteId(note);
            if (cloneIds.has(id)) {
                seq.splice(i, 1);
            }
        }
        this.dragData.cloned = false;
        this.dragData.cloneIds = null;
        this.dragData.notes = this.dragData.originalNotes;
        this.dragData.copyMode = false;
        this.selectedNotes = new Set(this.dragData.originalIds);
        const Tone = this.Tone || window.Tone;
        this.dragData.notes.forEach(entry => {
            entry.origStart = entry.note.start;
            entry.origDur = entry.note.dur || this.#defaultStepSeconds();
            entry.origMidi = Tone ? Tone.Frequency(entry.note.note).toMidi() : entry.origMidi;
        });
        if (event?.clientX) this.dragData.startX = event.clientX;
        this.#onSelectionChanged({ emit: false });
    }

    #handleNoteClick(evt, noteObj, noteId, index) {
        if (this._suppressClick) {
            this._suppressClick = false;
            return;
        }
        evt.stopPropagation();
        const meta = evt.metaKey || evt.ctrlKey;
        const additive = false; // Shift is reserved for resize during drag
        const wasSelected = this.selectedNotes.has(noteId);

        if (meta) {
            if (wasSelected) this.selectedNotes.delete(noteId);
            else this.selectedNotes.add(noteId);
        } else if (additive) {
            this.selectedNotes.add(noteId);
        } else if (!wasSelected || this.selectedNotes.size > 1) {
            this.selectedNotes.clear();
            this.selectedNotes.add(noteId);
        }

        this.state.selNote = index;
        this.#onSelectionChanged();
        this.draw();
        this.eventBus.dispatchEvent(new CustomEvent('note-preview', {
            detail: { note: noteObj.note, duration: 0.3, velocity: Math.min(1, (noteObj.vel ?? 0.9) + 0.1) }
        }));
    }

    #handleNoteMouseDown(evt, noteObj, noteId, midi) {
        if (evt.button !== 0) return;
        evt.stopPropagation();
        this._suppressClick = false;

        const meta = evt.metaKey || evt.ctrlKey;
        if (evt.altKey) this._altPressed = true;
        if (evt.shiftKey) this._shiftPressed = true;
        const copyIntent = this._altPressed || evt.altKey;
        const resizeIntent = !copyIntent && (this._shiftPressed || evt.shiftKey);
        const alreadySelected = this.selectedNotes.has(noteId);

        if (meta) {
            if (alreadySelected) {
                this.selectedNotes.delete(noteId);
            } else {
                this.selectedNotes.add(noteId);
            }
        } else if (!alreadySelected) {
            this.selectedNotes.clear();
            this.selectedNotes.add(noteId);
        }

        this.#onSelectionChanged({ emit: false });

        if (!this.selectedNotes.has(noteId)) {
            this.draw();
            return;
        }

        const Tone = this.Tone || window.Tone;
        const selectionIds = Array.from(this.selectedNotes);
        const originalNotes = selectionIds.map(id => {
            const idx = this.#getNoteIndexById(id);
            const targetNote = this.state.seq[idx];
            const noteMidi = Tone ? Tone.Frequency(targetNote.note).toMidi() : midi;
            return {
                id,
                note: targetNote,
                index: idx,
                origStart: targetNote.start,
                origDur: targetNote.dur || this.#defaultStepSeconds(),
                origMidi: noteMidi
            };
        });

        this.dragData = {
            mode: resizeIntent ? 'resize-duration' : 'move',
            startX: evt.clientX,
            startY: evt.clientY,
            copyMode: copyIntent,
            cloned: false,
            originalIds: selectionIds,
            originalNotes,
            notes: originalNotes,
            cloneIds: null
        };

        this.lastPreviewMidi = midi;
        this.isDragging = true;
        document.body.style.cursor = resizeIntent ? 'ew-resize' : (copyIntent ? 'copy' : 'grabbing');
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
        if (typeof state.zoomX === 'number') this.setZoomX(state.zoomX, { user: true });
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
        this.eventBus.addEventListener('sequence-changed', () => {
            if (typeof this.state?.seqMeta?.recordBpm === 'number') {
                this.currentBpm = this.state.seqMeta.recordBpm;
            }
            this.#markSequenceSignatureIfChanged();
        });
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
                if (!Number.isFinite(this._playbackTransportReference) || this._playbackTransportReference === 0) {
                    this._playbackTransportReference = Tone?.Transport?.seconds ?? 0;
                }
                this.startPlayheadAnimation();
            } else if (!e.detail.isPlaying && wasPlaying) {
                this._playbackTransportBase = 0;
                this._playbackTransportReference = 0;
                this.stopPlayheadAnimation();
            }
        });
        // Tone.js ready
        this.eventBus.addEventListener('tone-ready', e => { this.Tone = e.detail.Tone; this.draw(); });
        this.eventBus.addEventListener('playback-started', e => {
            const Tone = this.Tone || window.Tone;
            if (typeof e.detail?.transportReference === 'number') {
                this._playbackTransportReference = e.detail.transportReference;
            } else {
                this._playbackTransportReference = Tone?.Transport?.seconds ?? this._playbackTransportReference;
            }
            if (typeof e.detail?.transportStart === 'number') {
                this._playbackTransportBase = e.detail.transportStart;
            } else if (Number.isFinite(this._playbackTransportReference)) {
                this._playbackTransportBase = this._playbackTransportReference;
            } else {
                this._playbackTransportBase = Tone?.Transport?.seconds ?? this._playbackTransportBase;
            }
            if (!this.state.isPlaying) {
                this.startPlayheadAnimation();
            }
        });
        this.eventBus.addEventListener('playback-stopped', () => {
            this._playbackTransportBase = 0;
            this._playbackTransportReference = 0;
        });
        this.eventBus.addEventListener('tempo-changed', e => {
            const detail = e?.detail || {};
            const next = Number(detail.target) || Number(detail.tempo) || Number(detail.original);
            if (Number.isFinite(next)) {
                this.currentBpm = next;
                this.draw();
            }
        });
        // Keyboard shortcut (note delete)
        if (!this._keyListener) {
            this._keyListener = e => {
                const meta = e.metaKey || e.ctrlKey;
                const key = e.key?.toLowerCase?.() || e.key;
                if ((key === 'delete' || key === 'backspace')) {
                    if (this.selectedNotes.size) {
                        e.preventDefault();
                        this.#deleteSelection();
                        return;
                    }
                    if (typeof this.state.selNote === 'number' && this.state.selNote >= 0) {
                        this.eventBus.dispatchEvent(new CustomEvent('note-delete', { detail: { noteIndex: this.state.selNote } }));
                        this.state.seq.splice(this.state.selNote, 1);
                        this.state.selNote = null;
                        this.draw();
                        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
                    }
                } else if (meta && key === 'c') {
                    e.preventDefault();
                    this.#copySelection();
                } else if (meta && key === 'v') {
                    e.preventDefault();
                    this.#pasteSelection();
                } else if (meta && key === 'd') {
                    e.preventDefault();
                    this.#duplicateSelection();
                } else if (meta && key === 'a') {
                    e.preventDefault();
                    this.#selectAllNotes();
                } else if (meta && key === 'x') {
                    e.preventDefault();
                    if (this.selectedNotes.size) {
                        this.#copySelection();
                        this.#deleteSelection();
                    }
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }
    }

    draw() {
        if (!this.innerContent) return;
        const Tone = this.Tone || window.Tone; if (!Tone) { console.warn('[PianoRoll] No Tone.js.'); return; }
        const seq = this.state.seq || [];
        this.#markSequenceSignatureIfChanged(seq);
        const quantGridSeconds = this.quantizeEnabled ? this.#gridSeconds() : null;
        this.#pruneSelection();
        const actualSequenceLength = seq.length ? Math.max(...seq.map(o => o.start + o.dur)) : 0;
        const stepSeconds = this.#defaultStepSeconds();
        const loopDuration = this.loopEnabled && this.loopEnd > this.loopStart
            ? (this.loopEnd - this.loopStart)
            : 0;
        const defaultDuration = stepSeconds * this.DEFAULT_SEQUENCE_STEPS;
        this.sequenceLength = Math.max(defaultDuration, actualSequenceLength, loopDuration);
        const autoFitDuration = Math.max(
            stepSeconds * this.DEFAULT_SEQUENCE_STEPS,
            actualSequenceLength || 0,
            loopDuration || 0
        );
        const timeMax = Math.max(stepSeconds * this.DEFAULT_SEQUENCE_STEPS, actualSequenceLength, loopDuration);
        const gridTimeCount = quantGridSeconds
            ? Math.ceil(timeMax / quantGridSeconds) * quantGridSeconds
            : Math.ceil(timeMax / stepSeconds) * stepSeconds;
        this.#autoFitZoomX(autoFitDuration);
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
            this.#drawGridLines(gridCell, midi, gridTimeCount, quantGridSeconds ?? stepSeconds, cellW);
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
            this.#clearSelection();
        };
        this.#updateCursorVisual();
    }

    #drawGridLines(gridCell, midi, gridTimeCount, stepSizeSeconds, cellW) {
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
        if (midi === this.MIDI_HIGH) {
            const step = Math.max(stepSizeSeconds || this.#defaultStepSeconds(), 1e-6);
            const beatSeconds = this.#secondsPerBeat();
            for (let t = 0; t <= gridTimeCount + 1e-6; t += step) {
                const beats = t / beatSeconds;
                const isBar = Math.abs(beats % 4) < 1e-6;
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
            const noteMidi = Tone.Frequency(noteObj.note).toMidi();
            if (noteMidi !== midi) return;
            const noteId = this.#ensureNoteId(noteObj);
            const isSelected = this.selectedNotes.has(noteId);
            const x = noteObj.start * cellW;
            const w = Math.max(4, noteObj.dur * cellW);
            const noteDiv = this.#div({
                position: 'absolute',
                left: `${x}px`,
                width: `${w}px`,
                height: '100%',
                background: isSelected ? '#03dac6' : '#bb86fc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px #0004',
                opacity: noteObj.vel,
                zIndex: isSelected ? 12 : 10,
                cursor: this.cursorMode === 'copy' ? 'copy' : (this.cursorMode === 'resize' ? 'ew-resize' : 'grab'),
                outline: isSelected ? '2px solid #02a8a8' : 'none'
            });
            noteDiv.className = 'roll-note';
            noteDiv.dataset.noteId = noteId;
            noteDiv.dataset.idx = i;
            noteDiv.onclick = evt => this.#handleNoteClick(evt, noteObj, noteId, i);
            noteDiv.onmousedown = evt => this.#handleNoteMouseDown(evt, noteObj, noteId, noteMidi);
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
        if (this.selectionDrag) {
            this.#updateSelectionDragBox(e);
            return;
        }
        if (!this.dragData) return;
        this._altPressed = !!e.altKey;
        this._shiftPressed = !!e.shiftKey && !this._altPressed;
        if (this.dragData.mode === 'move') {
            const altActive = e.altKey;
            const shiftActive = e.shiftKey && !altActive;
            if (altActive && !this.dragData.cloned) {
                this.#activateCloneDrag(e);
            } else if (!altActive && this.dragData.cloned) {
                this.#deactivateCloneDrag(e);
            }
            this.dragData.copyMode = altActive;
            if (shiftActive) {
                this.dragData.mode = 'resize-duration';
                this.dragData.startX = e.clientX;
        this.dragData.notes.forEach(entry => {
            entry.origDur = entry.note.dur || this.#defaultStepSeconds();
        });
                document.body.style.cursor = 'ew-resize';
                return;
            }
            document.body.style.cursor = altActive ? 'copy' : 'grabbing';
        } else if (this.dragData.mode === 'resize-duration') {
            if (!(e.shiftKey) || this.dragData.copyMode) {
                const Tone = this.Tone || window.Tone;
                this.dragData.mode = 'move';
                this.dragData.startX = e.clientX;
                this.dragData.notes.forEach(entry => {
                    entry.origStart = entry.note.start;
                    entry.origMidi = Tone ? Tone.Frequency(entry.note.note).toMidi() : entry.origMidi;
                });
                document.body.style.cursor = this.dragData.copyMode ? 'copy' : 'grabbing';
            } else {
                document.body.style.cursor = 'ew-resize';
            }
        }
        if (this.dragData.mode === 'resize-duration') {
            const cellW = this.cellWidth || 40 * this.zoomX;
            const gridSeconds = this.quantizeEnabled ? this.#gridSeconds() : this.#defaultStepSeconds();
            const minDur = Math.max(gridSeconds || 0.01, 0.01);
            const dx = (e.clientX - this.dragData.startX) / cellW;

            this.dragData.notes.forEach(entry => {
                const note = entry.note;
                let newDur = entry.origDur + dx;
                if (gridSeconds) newDur = Math.round(newDur / gridSeconds) * gridSeconds;
                newDur = Math.max(minDur, newDur);
                note.dur = newDur;
            });

            this._suppressClick = true;
            this.draw();
            return;
        }

        if (!this.dragData.notes?.length) return;
        const Tone = this.Tone || window.Tone;
        if (!Tone) return;

        const cellW = this.cellWidth || 40 * this.zoomX;
        const rowHeight = this.CELL_H * this.zoomY;
        const dx = e.clientX - this.dragData.startX;
        const dy = e.clientY - this.dragData.startY;
        const dt = dx / cellW;
        const pitchOffset = -Math.round(dy / rowHeight);
        const currentQuant = this.quantizeEnabled ? this.#gridSeconds() : this.#defaultStepSeconds();

        this.dragData.notes.forEach(entry => {
            const note = entry.note;
            const newStart = entry.origStart + dt;
            note.start = Math.max(0, currentQuant ? Math.round(newStart / currentQuant) * currentQuant : newStart);
            const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, entry.origMidi + pitchOffset));
            try {
                note.note = Tone.Frequency(newMidi, 'midi').toNote();
            } catch {
                /* ignore conversion issues */
            }
        });

        const primary = this.dragData.notes[0];
        if (primary) {
            const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, primary.origMidi + pitchOffset));
            if (this.lastPreviewMidi !== newMidi) {
                try {
                    const previewNote = Tone.Frequency(newMidi, 'midi').toNote();
                    this.eventBus.dispatchEvent(new CustomEvent('note-preview', {
                        detail: { note: previewNote, duration: 0.3, velocity: 0.9 }
                    }));
                } catch {
                    /* ignore preview errors */
                }
                this.lastPreviewMidi = newMidi;
            }
        }

        this._suppressClick = true;
        this.draw();
    }

    #onGlobalDragUp(e) {
        if (this.selectionDrag) {
            this.#finalizeSelectionDrag();
            document.body.style.cursor = '';
            return;
        }

        if (!this.dragData) {
            document.body.style.cursor = '';
            return;
        }

        const altActive = !!(e?.altKey);
        const shiftActive = !!(e?.shiftKey) && !altActive;
        if (!altActive && this.dragData.cloned) {
            this.#deactivateCloneDrag(e);
        }
        this._altPressed = altActive;
        this._shiftPressed = shiftActive;

        if (this.dragData.mode === 'resize-duration') {
            this.#sortSequenceByStart();
            this.dragData.notes.forEach(entry => {
                const idx = this.#getNoteIndexById(entry.id);
                if (idx >= 0) {
                    this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                        detail: { noteIndex: idx, note: this.state.seq[idx] }
                    }));
                }
            });
            this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        } else if (this.dragData.notes?.length) {
            this.#sortSequenceByStart();
            this.dragData.notes.forEach(entry => {
                const idx = this.#getNoteIndexById(entry.id);
                if (idx >= 0) {
                    this.eventBus.dispatchEvent(new CustomEvent('note-edited', {
                        detail: { noteIndex: idx, note: this.state.seq[idx] }
                    }));
                }
            });
            this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
            this.eventBus.dispatchEvent(new CustomEvent('note-selection-changed', {
                detail: { selection: Array.from(this.selectedNotes) }
            }));
        }

        this.dragData = null;
        this.lastPreviewMidi = null;
        document.body.style.cursor = '';
        this.isDragging = false;
        this.#updateCursorVisual();
    }

    #handleGlobalKeyDown(event) {
        if (event.key === 'Alt') this._altPressed = true;
        if (event.key === 'Shift') this._shiftPressed = !this._altPressed;
        if (event.altKey) this._altPressed = true;
        if (event.shiftKey) this._shiftPressed = !this._altPressed;
        this.#updateCursorVisual();
    }

    #handleGlobalKeyUp(event) {
        if (event.key === 'Alt') this._altPressed = false;
        if (event.key === 'Shift') this._shiftPressed = false;
        if (!event.altKey) this._altPressed = false;
        if (!event.shiftKey) this._shiftPressed = false;
        if (!this.isDragging) this.#updateCursorVisual();
    }

    #currentCursorMode() {
        if (this._altPressed) return 'copy';
        if (this._shiftPressed) return 'resize';
        return 'move';
    }

    #updateCursorVisual() {
        this.cursorMode = this.#currentCursorMode();
        const style = this.cursorMode === 'copy' ? 'copy' : this.cursorMode === 'resize' ? 'ew-resize' : 'grab';
        if (this.scrollContainer) {
            this.scrollContainer.querySelectorAll('.roll-note').forEach(el => {
                el.style.cursor = style;
            });
        }
        if (!this.isDragging) {
            document.body.style.cursor = '';
        }
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
        const base = Number.isFinite(this._playbackTransportBase)
            ? this._playbackTransportBase
            : (Number.isFinite(this._playbackTransportReference) ? this._playbackTransportReference : 0);
        const elapsed = Math.max(0, transportSeconds - base);
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
    #computeSequenceSignature(seq = this.state?.seq) {
        if (!Array.isArray(seq) || !seq.length) return 'empty';
        let hash = `${seq.length}|${this.loopStart}|${this.loopEnd}`;
        for (let i = 0; i < seq.length; i += 1) {
            const note = seq[i];
            if (!note) continue;
            hash += `|${note.note ?? ''}:${Number(note.start).toFixed(4)}:${Number(note.dur).toFixed(4)}:${Number(note.vel ?? 0).toFixed(3)}`;
        }
        return hash;
    }

    #markSequenceSignatureIfChanged(seq = this.state?.seq) {
        const nextSig = this.#computeSequenceSignature(seq);
        if (nextSig !== this._lastSequenceSignature) {
            this._lastSequenceSignature = nextSig;
            if (!this._zoomXUserOverride) {
                this._autoZoomDirty = true;
            }
        }
    }
    #autoFitZoomX(totalDurationSeconds) {
        if (this._zoomXUserOverride || !this._autoZoomDirty) return;
        const container = this.scrollContainer;
        if (!container) return;
        const containerWidth = container.clientWidth || 0;
        if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
            requestAnimationFrame(() => {
                this._autoZoomDirty = true;
                this.draw();
            });
            return;
        }
        const trackWidth = Math.max(120, containerWidth - 48);
        if (!Number.isFinite(trackWidth) || trackWidth <= 0) {
            requestAnimationFrame(() => {
                this._autoZoomDirty = true;
                this.draw();
            });
            return;
        }
        const duration = Math.max(this.#defaultStepSeconds(), totalDurationSeconds || this.#defaultStepSeconds());
        const desiredZoom = trackWidth / (40 * duration);
        if (!Number.isFinite(desiredZoom) || desiredZoom <= 0) return;
        const clamped = Math.min(this.maxZoomX, Math.max(this.minZoomX, desiredZoom));
        if (Number.isFinite(clamped) && Math.abs(clamped - this.zoomX) > 0.01) {
            this.zoomX = clamped;
        }
        this._autoZoomDirty = false;
    }

    setZoomX(val, options = {}) {
        const clamped = Math.min(this.maxZoomX, Math.max(this.minZoomX, val));
        if (options.resetOverride) {
            this._zoomXUserOverride = false;
        } else if (options.user) {
            this._zoomXUserOverride = true;
            this._autoZoomDirty = false;
        }
        if (Math.abs(clamped - this.zoomX) < 0.0001) {
            if (options.forceDraw) this.draw();
            return;
        }
        this.zoomX = clamped;
        this.draw();
    }
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
        if (this._keyListenersAttached) {
            document.removeEventListener('keydown', this._boundKeyDown);
            document.removeEventListener('keyup', this._boundKeyUp);
            this._keyListenersAttached = false;
        }
        this.isDragging = false;
        this._altPressed = false;
        this._shiftPressed = false;
        if (this.rollGrid) this.rollGrid.innerHTML = '';
    }
}

export default PianoRoll;
