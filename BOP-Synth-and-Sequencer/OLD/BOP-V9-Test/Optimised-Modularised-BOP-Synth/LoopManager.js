/**
 * @file LoopManager.js
 * @description Manages loop functionality, quantization, and tempo as a singleton object.
 */

const LoopManager = {
    // --- State Properties ---
    isLoopEnabled: false,
    isLooping: false,
    loopStart: 0,
    loopEnd: 4,
    maxLoops: -1,
    currentLoopIteration: 0,
    
    quantizeEnabled: false,
    quantizeGridValue: 0.125, // Default to 1/32 note
    swingAmount: 0,
    
    originalTempo: 120,
    targetTempo: 120,
    
    scheduledEvents: [],
    
    /**
     * Initializes the loop manager. Called once from app.js.
     */
    init() {
        // In a singleton, the constructor logic goes into init.
        // We can set default values directly on properties.
        console.log('[LoopManager] Initializing loop system...');
    },

    // --- Public API Methods ---

    setLoopEnabled(enabled) {
        this.isLoopEnabled = enabled;
        console.log(`[LoopManager] Loop ${enabled ? 'enabled' : 'disabled'}`);
    },

    setQuantization(enabled, gridValue) {
        this.quantizeEnabled = enabled;
        if (gridValue !== undefined) {
            this.quantizeGridValue = gridValue;
        }
        console.log(`[LoopManager] Quantization ${enabled ? 'enabled' : 'disabled'}`);
    },

    setLoopBounds(start, end) {
        this.loopStart = Math.max(0, start);
        this.loopEnd = Math.max(this.loopStart, end);
        console.log(`[LoopManager] Loop bounds set: ${this.loopStart.toFixed(2)}s - ${this.loopEnd.toFixed(2)}s`);
    },

    autoDetectLoopBounds() {
        const seq = window.synthApp.seq || [];
        if (seq.length === 0) {
            this.setLoopBounds(0, 4);
            return { start: 0, end: 4 };
        }
        const firstNoteTime = Math.min(...seq.map(n => n.start));
        const lastNoteEndTime = Math.max(...seq.map(n => n.start + n.dur));
        this.setLoopBounds(firstNoteTime, lastNoteEndTime);
        return { start: this.loopStart, end: this.loopEnd };
    },

    setMaxLoops(count) {
        this.maxLoops = count;
    },

    setQuantizationGrid(gridKey) {
        const gridMap = { 'whole': 4, 'half': 2, 'quarter': 1, 'eighth': 0.5, 'sixteenth': 0.25, 'thirtysecond': 0.125 };
        this.quantizeGridValue = gridMap[gridKey] || 0.125;
    },

    getQuantizeGridKey() {
        const keyMap = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: 'eighth', 0.25: 'sixteenth', 0.125: 'thirtysecond' };
        return keyMap[this.quantizeGridValue] || 'thirtysecond';
    },

    setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
    },

    setTempoConversion(original, target) {
        this.originalTempo = original;
        this.targetTempo = target;
    },

    getLoopStatus() {
        return {
            enabled: this.isLoopEnabled,
            active: this.isLooping,
            duration: this.loopEnd - this.loopStart,
        };
    },
};

// This module doesn't need to be default exported if it's not the main logic
// but we will keep the pattern for consistency.
export default LoopManager;