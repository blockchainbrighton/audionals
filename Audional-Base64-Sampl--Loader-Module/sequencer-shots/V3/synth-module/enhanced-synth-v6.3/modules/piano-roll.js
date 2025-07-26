
// modules/piano-roll.js
import { LoopManager } from './loop.js';

/**
 * Piano Roll Module
 * Manages the visual representation and interaction of musical notes in a piano roll style grid.
 */
export const PianoRoll = {
    // MIDI note range constants (A0 to C8)
    MIDI_LOW: 21,
    MIDI_HIGH: 108,

    // Zoom levels
    zoomX: 1,
    zoomY: 1,
    minZoomX: 0.25,
    maxZoomX: 4,
    minZoomY: 0.5,
    maxZoomY: 2.5,

    // Base height for a single note row/cell
    CELL_H: 18,

    // Transport/animation related
    transportInterval: null,
    dragData: null,
    dragNoteIndex: null,
    lastPreviewMidi: null,

    /**
     * Initializes the piano roll structure and sets up event listeners.
     */
    init() {
        const grid = this.rollGrid = document.getElementById('rollGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Main container: fixed height, no overflow
        Object.assign(grid.style, {
            position: 'relative',
            background: '#181a1b',
            width: '100%',
            height: '60vh', // Fixed height: 60% of viewport height
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px',
            userSelect: 'none',
            overflow: 'hidden'
        });

        // --- Controls Bar ---
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

        // Precompute pitch count
        this.pitchCount = this.MIDI_HIGH - this.MIDI_LOW + 1;

        // --- Scrollable Container ---
        this.scrollContainer = this._div({
            display: 'flex',
            flexGrow: 1, // Takes remaining space in grid
            overflowX: 'auto',
            overflowY: 'auto',
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            background: 'transparent'
        });
        grid.appendChild(this.scrollContainer);

        // --- Main Content Area ---
        this.innerContent = this._div({
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100%', // Ensures it can grow
            position: 'relative'
        });
        this.scrollContainer.appendChild(this.innerContent);

        // --- Keyboard Shortcut Listener ---
        if (!this._keyListener) {
            this._keyListener = (e) => {
                if ((e.key === "Delete" || e.key === "Backspace") &&
                    typeof synthApp.selNote === "number" && synthApp.selNote >= 0) {
                    synthApp.seq.splice(synthApp.selNote, 1);
                    synthApp.selNote = null;
                    this.draw();
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }

        // Initial draw
        this.draw();
    },

    /**
     * Redraws the entire piano roll grid, notes, and handles scrolling logic.
     */
    draw() {
        const seq = synthApp.seq || [];
        const quantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
        const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));

        // Determine the total time duration to display
        const gridTimeCount = quantGrid
            ? Math.ceil(timeMax / quantGrid) * quantGrid
            : Math.ceil(timeMax / 0.25) * 0.25;

        // Calculate cell dimensions based on zoom
        const cellW = 40 * this.zoomX;
        const cellH = this.CELL_H * this.zoomY;

        // Clear previous content
        this.innerContent.innerHTML = '';

        // Calculate total width for the grid portion
        const gridWidth = cellW * gridTimeCount;

        // Variables for scrolling logic
        let firstNoteElement = null; // Element of the row for the first note
        let c4Element = null;       // Element of the row for C4
        let firstNoteMidi = null;

        // Attempt to get the MIDI of the first note if sequence exists
        if (seq.length > 0 && seq[0]?.note) {
            try {
                firstNoteMidi = Tone.Frequency(seq[0].note).toMidi();
            } catch (e) {
                console.warn("Error parsing first note for scroll:", seq[0].note, e);
                firstNoteMidi = null; // Fallback to C4 if parsing fails
            }
        }

        // --- Generate Rows (Pitch by Pitch) ---
        for (let midi = this.MIDI_HIGH; midi >= this.MIDI_LOW; midi--) {
            const isC4 = (midi === 60);
            const isCurrentFirstNote = (midi === firstNoteMidi);
            const row = this.MIDI_HIGH - midi; // Row index from top (0 is highest note)
            // const y = row * cellH; // Not directly used as top positioning, handled by flex order

            // --- Create Row Container ---
            const rowDiv = this._div({
                display: 'flex',
                height: cellH + 'px',
                minHeight: cellH + 'px',
                position: 'relative'
            });

            // --- Create Label Cell ---
            const labelCell = this._div({
                width: '48px',
                minWidth: '48px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '8px',
                fontWeight: (midi % 12 === 0) ? 'bold' : 'normal',
                color: (midi % 12 === 0) ? '#fff' : '#aaa',
                background: this.isBlackKey(midi) ? '#18181c' : '#232323',
                borderBottom: '1px solid #23232a',
                fontSize: '13px',
                userSelect: 'none',
                zIndex: 2,
                borderRight: '2px solid #282828'
            }, window.Tone ? Tone.Frequency(midi, "midi").toNote() : midi);

            // --- Create Grid Cell (Note Area) ---
            const gridCell = this._div({
                position: 'relative',
                flexGrow: 1,
                height: '100%',
                minHeight: '100%',
                background: 'transparent'
            });

            // --- Draw Horizontal Line ---
            const hLine = this._div({
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '1px',
                background: (midi % 12 === 0) ? '#444' : '#292b2e',
                opacity: (midi % 12 === 0) ? 0.55 : 0.22,
                pointerEvents: 'none',
                zIndex: 1
            });
            gridCell.appendChild(hLine);

            // --- Draw Black Key Background ---
            if (this.isBlackKey(midi)) {
                const bg = this._div({
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: '#1c1c22',
                    opacity: 0.46,
                    zIndex: 0,
                    pointerEvents: 'none'
                });
                gridCell.appendChild(bg);
            }

            // --- Draw Vertical Grid Lines (per row for simplicity) ---
            if (quantGrid) {
                for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                    const isBar = (Math.round(t / 4) * 4 === t);
                    const vLine = this._div({
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: (t * cellW) + 'px',
                        width: isBar ? '2px' : '1px',
                        background: isBar ? '#444' : '#292b2e',
                        opacity: isBar ? 0.6 : 0.22,
                        pointerEvents: 'none',
                        zIndex: 1
                    });
                    gridCell.appendChild(vLine);

                    // --- Draw Bar Labels (only on the top row) ---
                    if (isBar && t !== 0 && midi === this.MIDI_HIGH) {
                        const labelTop = this._div({
                            position: 'absolute',
                            top: '-18px',
                            left: (t * cellW) + 2 + 'px',
                            fontSize: '12px',
                            color: '#555',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }, `Bar ${Math.floor(t / 4) + 1}`);
                        // Append bar labels to innerContent so they are above rows
                        this.innerContent.appendChild(labelTop);
                    }
                }
            }

            // --- Append Cells to Row ---
            rowDiv.appendChild(labelCell);
            rowDiv.appendChild(gridCell);
            this.innerContent.appendChild(rowDiv); // Add row to main content

            // --- Store Reference Elements for Scrolling ---
            if (isC4) {
                c4Element = rowDiv;
            }
            if (isCurrentFirstNote) {
                firstNoteElement = rowDiv;
            }

            // --- Draw Notes in this specific row ---
            seq.forEach((noteObj, i) => {
                const noteMidi = Tone.Frequency(noteObj.note).toMidi();
                // Only draw notes that belong to this MIDI pitch row
                if (noteMidi !== midi) return;

                const x = noteObj.start * cellW;
                const w = noteObj.dur * cellW;

                const noteDiv = this._div({
                    position: 'absolute',
                    left: x + 'px',
                    width: w + 'px',
                    height: '100%', // Fill the row height
                    background: '#bb86fc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px #0004',
                    opacity: noteObj.vel,
                    outline: synthApp.selNote === i ? '2px solid #03dac6' : '',
                    zIndex: 10,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '2px',
                    fontWeight: 'bold',
                    color: '#232323'
                }, '');

                noteDiv.dataset.idx = i;
                noteDiv.tabIndex = 0;

                noteDiv.onclick = (evt) => {
                    evt.stopPropagation();
                    this.innerContent.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
                    noteDiv.classList.add('selected');
                    synthApp.selNote = i;
                    if (window.synthApp?.synth) {
                        window.synthApp.synth.triggerAttackRelease(
                            Tone.Frequency(midi, "midi").toNote(), 0.3, undefined, 0.9
                        );
                    }
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
                gridCell.appendChild(noteDiv); // Add note to its row's grid cell
            });
        } // --- End Row Generation Loop ---

        // --- Set Total Content Width ---
        this.innerContent.style.width = `calc(48px + ${gridWidth}px)`; // Label width + grid width

        // --- Scrolling Logic ---
        // Scroll after the DOM has been updated with the new rows
        requestAnimationFrame(() => {
            if (this.scrollContainer) {
                const containerRect = this.scrollContainer.getBoundingClientRect();
                const containerHeight = containerRect.height;
                let targetElement = null;

                // Priority 1: Scroll to the first note if it exists
                if (seq.length > 0 && firstNoteElement) {
                    targetElement = firstNoteElement;
                }
                // Priority 2: Scroll to C4 if no first note or first note element not found
                else if (c4Element) {
                    targetElement = c4Element;
                }

                // Perform the scroll if a target element was found
                if (targetElement) {
                    const targetRect = targetElement.getBoundingClientRect();
                    // Calculate the scroll offset needed to center the target row
                    const scrollTopTarget = targetRect.top - containerRect.top - (containerHeight / 2) + (targetRect.height / 2) + this.scrollContainer.scrollTop;
                    this.scrollContainer.scrollTo({ top: scrollTopTarget, behavior: 'auto' });
                }
            }
        });

        // --- Setup Drag Listeners ---
        const onMove = (e) => {
            if (!this.dragData || this.dragNoteIndex === null) return;
            const currentSeq = synthApp.seq; // Get seq reference inside the handler
            const note = currentSeq[this.dragNoteIndex];
            const dx = (e.clientX - this.dragData.startX);
            const dy = (e.clientY - this.dragData.startY);

            // Handle horizontal drag (time/start)
            let dt = dx / (40 * this.zoomX);
            const currentQuantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
            let newStart;
            if (currentQuantGrid) {
                newStart = Math.round((this.dragData.origStart + dt) / currentQuantGrid) * currentQuantGrid;
            } else {
                newStart = this.dragData.origStart + dt;
            }
            note.start = Math.max(0, Math.round(newStart * 1000) / 1000);

            // Handle vertical drag (pitch)
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

            this.draw(); // Redraw to reflect changes
        };

        const onUp = () => {
            this.dragData = null;
            this.dragNoteIndex = null;
            this.lastPreviewMidi = null;
            document.body.style.cursor = '';
        };

        // Ensure only one listener is attached
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        // --- Deselect on Empty Click ---
        this.innerContent.onclick = (e) => {
            // Check if the click was on the background or a note
            if (e.target.classList.contains('roll-note') || e.target.closest('.roll-note')) {
                 // Click was on a note, selection handled by note's onclick
                 return;
            }
            // Click was elsewhere (background), deselect
            synthApp.selNote = null;
            this.innerContent.querySelectorAll('.roll-note').forEach(el => el.classList.remove('selected'));
        };


        // --- Playhead ---
        if (synthApp.isPlaying) {
            this._drawPlayhead(synthApp.currentTime || 0, cellW, cellH);
            if (!this.transportInterval) {
                this.transportInterval = setInterval(() => {
                    this._drawPlayhead(synthApp.currentTime || 0, cellW, cellH);
                }, 33); // ~30fps
            }
        } else if (this.transportInterval) {
            clearInterval(this.transportInterval);
            this.transportInterval = null;
        }
    },

    /**
     * Draws or updates the playhead position.
     * @param {number} playTime - The current playback time in seconds.
     * @param {number} cellW - The width of a time cell.
     * @param {number} cellH - The height of a pitch cell.
     */
    _drawPlayhead(playTime, cellW, cellH) {
        if (!this.innerContent) return; // Safety check

        // Find or create the playhead element within the scroll container
        // We place it directly in the scrollContainer to cover the full height easily
        let ph = this.scrollContainer.querySelector('.playhead');
        if (!ph) {
            ph = this._div({
                position: 'absolute',
                top: 0,
                // height will be set dynamically
                width: '3px',
                background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                opacity: 0.9,
                zIndex: 99,
                pointerEvents: 'none'
            });
            ph.className = 'playhead';
            this.scrollContainer.appendChild(ph); // Append to scroll container
        }

        // Position the playhead
        ph.style.left = (playTime * cellW + 48) + 'px'; // Offset by label column width

        // Dynamically set height to match scroll content
        const contentHeight = this.innerContent.scrollHeight || this.innerContent.offsetHeight;
        if (contentHeight > 0) {
             ph.style.height = contentHeight + 'px';
        } else {
             // Fallback if content height is not immediately available
             ph.style.height = '100%';
        }
    },

    // --- Utility Functions ---

    /**
     * Creates a div element with specified styles and optional text content.
     * @param {Object} styleObj - CSS styles to apply.
     * @param {string} [text] - Optional text content.
     * @returns {HTMLDivElement} The created div element.
     */
    _div(styleObj, text) {
        const d = document.createElement('div');
        Object.assign(d.style, styleObj);
        if (text !== undefined) d.textContent = text;
        return d;
    },

    /**
     * Creates a styled button element.
     * @param {string} txt - Button text.
     * @param {Function} onClick - Click handler function.
     * @returns {HTMLButtonElement} The created button element.
     */
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

    /**
     * Creates a styled label span element.
     * @param {string} txt - Label text.
     * @returns {HTMLSpanElement} The created span element.
     */
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

    /**
     * Checks if a given MIDI note corresponds to a black key on a piano.
     * @param {number} midi - The MIDI note number.
     * @returns {boolean} True if it's a black key, false otherwise.
     */
    isBlackKey(midi) {
        return [1, 3, 6, 8, 10].includes(midi % 12); // Semitone offsets for black keys
    },

    /**
     * Sets the horizontal zoom level and redraws.
     * @param {number} val - The new zoom level.
     */
    setZoomX(val) {
        this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val));
        this.draw();
    },

    /**
     * Sets the vertical zoom level and redraws.
     * @param {number} val - The new zoom level.
     */
    setZoomY(val) {
        this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val));
        this.draw();
    }
};
