/**
 * @file Keyboard.js
 * @description Virtual keyboard UI component for the BOP Synthesizer.
 * Refactored to use event-driven communication and true dependency injection.
 */

export class Keyboard {
    static WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    static BLACK_NOTES = { 0: 'C#', 1: 'D#', 3: 'F#', 4: 'G#', 5: 'A#' };

    constructor(containerElement, eventBus, state, Tone) {
        this.parentContainer = containerElement;
        if (!this.parentContainer) {
            console.error('[Keyboard] A valid parent container element was not provided.');
            return;
        }

        this.eventBus = eventBus;
        this.state = state;
        this.Tone = Tone;
        if (!this.Tone) throw new Error('[Keyboard] Tone.js instance was not provided to the constructor.');

        this.keyboardEl = this.parentContainer.querySelector('.keyboard');
        this.octaveUpBtn = this.parentContainer.querySelector('#octaveUp');
        this.octaveDownBtn = this.parentContainer.querySelector('#octaveDown');
        this.octaveLabel = this.parentContainer.querySelector('#octaveLabel');

        if (!this.keyboardEl || !this.octaveUpBtn || !this.octaveDownBtn || !this.octaveLabel) {
            console.error('[Keyboard] Could not find required child elements (keyboard, octave controls) inside the provided container.');
            return;
        }

        this.init();
    }

    init() {
        this.octaveUpBtn.onclick = () => this.changeOctave(1);
        this.octaveDownBtn.onclick = () => this.changeOctave(-1);

        this.eventBus.addEventListener('keyboard-redraw', () => this.draw());
        this.eventBus.addEventListener('keyboard-note-visual', (e) => this.updateKeyVisual(e.detail.note, e.detail.active));
        this.eventBus.addEventListener('release-all-keys', () => this.releaseAllKeys());
        this.eventBus.addEventListener('octave-change', (e) => {
            const requested = e?.detail?.octave;
            if (typeof requested === 'number') {
                this.setOctave(requested, { broadcast: false });
            }
        });

        this.pointerState = {
            pointerId: null,
            activeNote: null,
            isMouseDragging: false
        };
        this.boundGlobalMouseUp = this.handleGlobalMouseUp.bind(this);
        this.boundGlobalPointerMove = this.handleGlobalPointerMove.bind(this);
        this.boundGlobalPointerUp = this.handleGlobalPointerUp.bind(this);
        this.debugLogState = {
            lastNote: null,
            lastTime: 0,
            intervalMs: 80
        };
        this.draw();
        console.log('[Keyboard] UI Component Initialized.');
    }
    getDocumentRef() {
        return this.parentContainer?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    }

    changeOctave(direction) {
        const newOctave = this.state.curOct + direction;
        this.setOctave(newOctave);
    }

    setOctave(targetOctave, { broadcast = true } = {}) {
        const clamped = Math.max(0, Math.min(7, Math.round(targetOctave)));
        const previous = this.state.curOct;
        this.state.curOct = clamped;

        if (this.octaveLabel) {
            this.octaveLabel.textContent = `Octave: ${clamped}`;
        }

        if (previous !== clamped) {
            this.draw();
        }

        if (broadcast && previous !== clamped) {
            this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
                detail: { octave: clamped }
            }));
        }
    }

    draw() {
        if (!this.Tone) { 
            console.warn('[Keyboard] Cannot draw; Tone.js is not ready.');
            return;
        }

        this.keyboardEl.innerHTML = '';
        const kbWidth = this.keyboardEl.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = Keyboard.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            const note = this.Tone.Frequency(`${wn}${this.state.curOct + octaveOffset}`).toNote(); 

            const wkey = this.createKey('key-white', note);
            wkey.style.left = (i * whiteKeyW) + '%';
            wkey.style.width = whiteKeyW + '%';

            if (wn === "C" || wn === "F") {
                const lbl = document.createElement('span');
                lbl.className = 'key-label';
                lbl.innerText = note;
                wkey.appendChild(lbl);
            }
            this.keyboardEl.appendChild(wkey);
            whiteIndex++;
        }

        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (Keyboard.BLACK_NOTES.hasOwnProperty(whiteIndex % 7)) {
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNoteName = Keyboard.BLACK_NOTES[whiteIndex % 7];
                const note = this.Tone.Frequency(`${blackNoteName}${this.state.curOct + octaveOffset}`).toNote();

                const bkey = this.createKey('key-black', note);
                const leftPercent = (i + 0.7) * whiteKeyW - (whiteKeyW * 0.28);
                bkey.style.left = leftPercent + '%';
                bkey.style.width = (whiteKeyW * 0.62) + '%';
                this.keyboardEl.appendChild(bkey);
            }
            whiteIndex++;
        }
    }

    createKey(className, note) {
        const keyEl = document.createElement('div');
        keyEl.className = className;
        keyEl.dataset.note = note;
        keyEl.tabIndex = 0;
        this.addKeyHandlers(keyEl, note);
        return keyEl;
    }

    addKeyHandlers(el, note) {
        const play = () => this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-on', { detail: { note, velocity: 1.0 } }));
        const release = () => this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', { detail: { note } }));

        const pointerSupported = typeof window !== 'undefined' && window.PointerEvent;
        if (pointerSupported) {
            el.addEventListener('pointerdown', e => {
                e.preventDefault();
                this.logPointerEvent('pointerdown', note, e);
                this.startPointerDrag(e.pointerId ?? -1, note, el, e);
            });
            el.addEventListener('pointerenter', e => {
                if (this.pointerState.pointerId === e.pointerId) {
                    this.logPointerEvent('pointerenter', note, e);
                    this.switchDragNote(note);
                }
            });
            el.addEventListener('pointerup', e => {
                this.logPointerEvent('pointerup', note, e);
                this.endPointerDrag(e.pointerId ?? -1);
            });
            el.addEventListener('pointercancel', e => {
                this.logPointerEvent('pointercancel', note, e);
                this.endPointerDrag(e.pointerId ?? -1);
            });
        } else {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                this.startMouseDrag(note);
            });
            el.addEventListener('mouseenter', () => {
                if (this.pointerState.isMouseDragging) {
                    this.switchDragNote(note);
                }
            });
            el.addEventListener('mouseup', () => {
                if (this.pointerState.isMouseDragging) {
                    this.endMouseDrag();
                } else {
                    release();
                }
            });
            el.addEventListener('mouseleave', () => {
                if (!this.pointerState.isMouseDragging) {
                    release();
                }
            });
            el.addEventListener('touchstart', e => {
                e.preventDefault();
                this.switchDragNote(note);
                this.pointerState.isMouseDragging = true;
                window.addEventListener('touchend', this.boundGlobalMouseUp, { once: true });
            });
        }
    }

    startPointerDrag(pointerId, note, el, event = null) {
        this.pointerState.pointerId = pointerId;
        if (el && typeof el.setPointerCapture === 'function') {
            try { el.setPointerCapture(pointerId); } catch { /* ignore */ }
        }
        const doc = this.getDocumentRef();
        doc?.addEventListener('pointermove', this.boundGlobalPointerMove);
        doc?.addEventListener('pointerup', this.boundGlobalPointerUp);
        if (event) {
            this.logPointerEvent('startPointerDrag', note, event);
        }
        this.switchDragNote(note);
    }

    endPointerDrag(pointerId) {
        if (this.pointerState.pointerId !== pointerId) return;
        this.releaseActiveDragNote();
        this.pointerState.pointerId = null;
        const doc = this.getDocumentRef();
        doc?.removeEventListener('pointermove', this.boundGlobalPointerMove);
        doc?.removeEventListener('pointerup', this.boundGlobalPointerUp);
    }

    startMouseDrag(note) {
        this.pointerState.isMouseDragging = true;
        this.switchDragNote(note);
        const doc = this.getDocumentRef();
        doc?.addEventListener('mouseup', this.boundGlobalMouseUp);
        doc?.addEventListener('mousemove', this.boundGlobalPointerMove);
    }

    endMouseDrag() {
        this.pointerState.isMouseDragging = false;
        this.releaseActiveDragNote();
        const doc = this.getDocumentRef();
        doc?.removeEventListener('mouseup', this.boundGlobalMouseUp);
        doc?.removeEventListener('mousemove', this.boundGlobalPointerMove);
    }

    handleGlobalMouseUp() {
        if (!this.pointerState.isMouseDragging) return;
        this.endMouseDrag();
    }

    handleGlobalPointerUp(event) {
        if (this.pointerState.pointerId === event.pointerId) {
            this.endPointerDrag(event.pointerId);
        }
    }

    handleGlobalPointerMove(event) {
        if (!this.pointerState.pointerId && !this.pointerState.isMouseDragging) return;
        const doc = this.parentContainer?.ownerDocument || document;
        if (!doc?.elementFromPoint) return;
        const hoveredEl = doc.elementFromPoint(event.clientX, event.clientY);
        if (!hoveredEl || typeof hoveredEl.closest !== 'function') return;
        const keyEl = hoveredEl.closest('.key-white, .key-black');
        if (!keyEl || !this.parentContainer.contains(keyEl)) return;
        const note = keyEl.dataset?.note;
        if (!note) return;
        this.switchDragNote(note);
    }

    switchDragNote(note) {
        if (this.pointerState.activeNote === note) return;
        this.logDragDebug(note);
        if (this.pointerState.activeNote) {
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
                detail: { note: this.pointerState.activeNote }
            }));
        }
        this.pointerState.activeNote = note;
        this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-on', {
            detail: { note, velocity: 1.0 }
        }));
    }

    releaseActiveDragNote() {
        if (!this.pointerState.activeNote) return;
        this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-off', {
            detail: { note: this.pointerState.activeNote }
        }));
        this.pointerState.activeNote = null;
    }

    logPointerEvent(stage, note, event) {
        if (!event) return;
        const now = typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
        if ((now - this.pointerEventLogState.lastTime) < this.pointerEventLogState.intervalMs) {
            return;
        }
        this.pointerEventLogState.lastTime = now;
        const info = `id=${event.pointerId ?? 'n/a'} type=${event.pointerType} button=${event.button} buttons=${event.buttons} client=(${event.clientX},${event.clientY})`;
        console.debug(`[KeyboardPointer] ${stage} note=${note ?? 'n/a'} ${info}`);
    }

    logDragDebug(note) {
        const now = typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
        if (this.debugLogState.lastNote === note && (now - this.debugLogState.lastTime) < this.debugLogState.intervalMs) {
            return;
        }
        this.debugLogState.lastNote = note;
        this.debugLogState.lastTime = now;
        const mode = this.pointerState.pointerId
            ? `pointer:${this.pointerState.pointerId}`
            : (this.pointerState.isMouseDragging ? 'mouse' : 'static');
        const stack = new Error().stack;
        const caller = stack?.split?.('\n')?.slice(2, 3)?.[0]?.trim() ?? 'unknown caller';
        console.debug(`[KeyboardDrag] -> ${note} via ${mode} (${caller})`);
    }

    updateKeyVisual(note, on) {
        const keyElement = this.keyboardEl.querySelector(`[data-note="${note}"]`);
        if (keyElement) keyElement.classList.toggle('active', !!on);
    }

    releaseAllKeys() {
        this.keyboardEl.querySelectorAll('.active').forEach(activeKey => {
            activeKey.classList.remove('active');
        });
        console.log('[Keyboard] All visual keys released.');
    }

}

export default Keyboard;
