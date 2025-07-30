/**
 * @file LoopManager.js
 * @description Manages loop functionality, quantization, and tempo.
 * Refactored for non-destructive quantization and robust UI sync.
 */

export class LoopManager {
    constructor(state, eventBus) {
        this.state = state;
        this.eventBus = eventBus;

        // Loop state
        this.isLoopEnabled = false;
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 4;
        this.maxLoops = -1;
        this.currentLoopIteration = 0;

        // Quantize
        this.quantizeEnabled = false;
        this.quantizeGridValue = 0.125; // Default 1/32
        this.swingAmount = 0;

        // Tempo
        this.originalTempo = 120;
        this.targetTempo = 120;

        // For non-destructive quantize:
        this.originalSeq = null; // Always keep the original!
        this.scheduledEvents = [];

        this.init();
    }

    init() {
        console.log('[LoopManager] Initializing loop system...');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Loop
        this.eventBus.addEventListener('loop-toggle-enabled', (e) => {
            this.setLoopEnabled(e.detail.enabled);
            this.dispatchLoopState();
        });
        this.eventBus.addEventListener('loop-toggle', () => this.toggleLoop());
        this.eventBus.addEventListener('loop-clear', () => this.clearLoop());
        this.eventBus.addEventListener('loop-bounds-set', (e) => {
            const { start, end } = e.detail;
            this.setLoopBounds(start, end);
        });
        this.eventBus.addEventListener('loop-auto-detect', () => this.autoDetectLoopBounds());

        // Quantize events
        this.eventBus.addEventListener('quantize-toggle', (e) => {
            this.setQuantization(e.detail.enabled);
        });
        this.eventBus.addEventListener('quantize-grid-set', (e) => {
            this.setQuantization(true, this.getGridValueFromKey(e.detail.gridKey));
        });
        this.eventBus.addEventListener('swing-change', (e) => {
            this.setSwing(e.detail.amount);
        });

        // Add this to the list of event listeners:
        this.eventBus.addEventListener('request-loop-state', () => {
            // The UI is asking for the current state. Dispatch it.
            this.dispatchLoopState();
        });

        // Project/load logic
        this.eventBus.addEventListener('loop-settings-load', (e) => {
            const { enabled, start, end, quantize, grid, swing } = e.detail;
            this.setLoopEnabled(enabled);
            this.setLoopBounds(start, end);
            this.setQuantization(quantize, grid);
            this.setSwing(swing || 0);
        });

        // When the sequence is replaced externally (new recording/load), update originalSeq:
        this.eventBus.addEventListener('sequence-changed', () => {
            this.ensureOriginalSeq();
            if (this.quantizeEnabled) {
                this.applyQuantizeView();
            }
        });
    }

    // Non-destructive quantize: always maintain a clean original array
    ensureOriginalSeq() {
        if (!this.state.seq) this.state.seq = [];
        // Only update originalSeq if state.seq is NOT already a quantized version!
        if (
            !this.originalSeq ||
            this.originalSeq.length !== this.state.seq.length ||
            this.state.seq.some((n, i) => !this.originalSeq[i] || n.id !== this.originalSeq[i].id)
        ) {
            this.originalSeq = this.state.seq.map(n => ({ ...n }));
        }
    }

    toggleLoop() {
        this.setLoopEnabled(!this.isLoopEnabled);
        this.dispatchLoopState();
    }

    dispatchLoopState() {
        this.eventBus.dispatchEvent(new CustomEvent('loop-state-update', {
            detail: this.getLoopStatus()
        }));
    }

    setLoopEnabled(enabled) {
        this.isLoopEnabled = enabled;
        console.log(`[LoopManager] Loop ${enabled ? 'enabled' : 'disabled'}`);
        this.eventBus.dispatchEvent(new CustomEvent('loop-state-changed', {
            detail: {
                enabled: this.isLoopEnabled,
                start: this.loopStart,
                end: this.loopEnd
            }
        }));
    }

    setQuantization(enabled, gridValue) {
        // Save new settings
        this.quantizeEnabled = enabled;
        if (gridValue !== undefined) this.quantizeGridValue = gridValue;

        // Ensure original sequence is always present
        this.ensureOriginalSeq();

        // Derive quantized view or revert
        this.applyQuantizeView();

        this.dispatchLoopState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    applyQuantizeView() {
        if (this.quantizeEnabled) {
            this.state.seq = this.quantizeSequenceArray(
                this.originalSeq,
                this.quantizeGridValue,
                this.swingAmount
            );
        } else {
            // Restore original sequence
            this.state.seq = this.originalSeq ? this.originalSeq.map(n => ({ ...n })) : [];
        }
    }

    quantizeSequenceArray(seq, grid, swing) {
        if (!Array.isArray(seq)) return [];
        return seq.map(note => {
            let snapped = Math.round(note.start / grid) * grid;
            if (swing > 0) {
                const beatPos = (snapped / grid) % 2;
                if (beatPos === 1) snapped += grid * swing * 0.1;
            }
            // Always return a new note object (deep copy)
            return { ...note, start: snapped };
        });
    }

    setLoopBounds(start, end) {
        this.loopStart = Math.max(0, start);
        this.loopEnd = Math.max(this.loopStart, end);
        console.log(`[LoopManager] Loop bounds set: ${this.loopStart.toFixed(2)}s - ${this.loopEnd.toFixed(2)}s`);
        this.eventBus.dispatchEvent(new CustomEvent('loop-bounds-changed', {
            detail: { start: this.loopStart, end: this.loopEnd }
        }));
    }

    autoDetectLoopBounds() {
        const seq = this.state.seq || [];
        if (!seq.length) {
            this.setLoopBounds(0, 4);
            return { start: 0, end: 4 };
        }
        const firstNoteTime = Math.min(...seq.map(n => n.start));
        const lastNoteEndTime = Math.max(...seq.map(n => n.start + n.dur));
        this.setLoopBounds(firstNoteTime, lastNoteEndTime);
        return { start: this.loopStart, end: this.loopEnd };
    }

    clearLoop() {
        this.setLoopEnabled(false);
        this.setLoopBounds(0, 4);
        this.currentLoopIteration = 0;
        this.eventBus.dispatchEvent(new CustomEvent('loop-cleared'));
    }

    setMaxLoops(count) {
        this.maxLoops = count;
    }

    setQuantizationGrid(gridKey) {
        this.quantizeGridValue = this.getGridValueFromKey(gridKey);
        this.dispatchLoopState();
        this.eventBus.dispatchEvent(new CustomEvent('quantization-grid-changed', {
            detail: { gridValue: this.quantizeGridValue, gridKey }
        }));
    }

    getQuantizeGridKey() {
        const keyMap = {
            4: 'whole', 2: 'half', 1: 'quarter',
            0.5: 'eighth', 0.25: 'sixteenth', 0.125: 'thirtysecond'
        };
        return keyMap[this.quantizeGridValue] || 'thirtysecond';
    }

    getGridValueFromKey(gridKey) {
        const gridMap = {
            'whole': 4, 'half': 2, 'quarter': 1,
            'eighth': 0.5, 'sixteenth': 0.25, 'thirtysecond': 0.125
        };
        return gridMap[gridKey] || 0.125;
    }

    setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        // On swing change, re-quantize if needed
        if (this.quantizeEnabled) {
            this.applyQuantizeView();
            this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        }
        this.eventBus.dispatchEvent(new CustomEvent('swing-changed', { detail: { amount: this.swingAmount } }));
    }

    setTempoConversion(original, target) {
        this.originalTempo = original;
        this.targetTempo = target;
        this.eventBus.dispatchEvent(new CustomEvent('tempo-changed', {
            detail: { original, target }
        }));
    }

    getLoopStatus() {
        return {
            enabled: this.isLoopEnabled,
            active: this.isLooping,
            duration: this.loopEnd - this.loopStart,
            start: this.loopStart,
            end: this.loopEnd,
            quantizeEnabled: this.quantizeEnabled,
            quantizeGridValue: this.quantizeGridValue,
            swingAmount: this.swingAmount
        };
    }

    quantizeTime(time) {
        if (!this.quantizeEnabled) return time;
        const grid = this.quantizeGridValue;
        let quantized = Math.round(time / grid) * grid;
        if (this.swingAmount > 0) {
            const beatPosition = (quantized / grid) % 2;
            if (beatPosition === 1) quantized += grid * this.swingAmount * 0.1;
        }
        return quantized;
    }

    getLoopSettings() {
        return {
            enabled: this.isLoopEnabled,
            start: this.loopStart,
            end: this.loopEnd,
            quantize: this.quantizeEnabled,
            grid: this.quantizeGridValue,
            swing: this.swingAmount
        };
    }

    destroy() {
        this.scheduledEvents = [];
        // Event listeners will be cleaned up when eventBus is destroyed
    }
}

export default LoopManager;
