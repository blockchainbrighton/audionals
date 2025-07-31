/**
 * @file LoopManager.js
 * @description Manages loop functionality, quantization, and tempo.
 * Refactored to use dependency injection and event-driven communication.
 */

export class LoopManager {
    constructor(state, eventBus) {
        this.state = state;
        this.eventBus = eventBus;
        
        // Loop state properties
        this.isLoopEnabled = false;
        this.isLooping = false;
        this.loopStart = 0;
        this.loopEnd = 4;
        this.maxLoops = -1;
        this.currentLoopIteration = 0;
        
        // Quantization properties
        this.quantizeEnabled = false;
        this.quantizeGridValue = 0.125; // Default to 1/32 note
        this.swingAmount = 0;
        
        // Tempo properties
        this.originalTempo = 120;
        this.targetTempo = 120;
        
        this.scheduledEvents = [];
        
        this.init();
    }
    
    init() {
        console.log('[LoopManager] Initializing loop system...');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for loop control events
        this.eventBus.addEventListener('loop-toggle', () => {
            this.toggleLoop();
        });
        
        this.eventBus.addEventListener('loop-clear', () => {
            this.clearLoop();
        });
        
        this.eventBus.addEventListener('loop-bounds-set', (e) => {
            const { start, end } = e.detail;
            this.setLoopBounds(start, end);
        });
        
        this.eventBus.addEventListener('loop-auto-detect', () => {
            this.autoDetectLoopBounds();
        });
        
        this.eventBus.addEventListener('quantize-toggle', (e) => {
            const { enabled, gridValue } = e.detail;
            this.setQuantization(enabled, gridValue);
        });
        
        this.eventBus.addEventListener('swing-change', (e) => {
            const { amount } = e.detail;
            this.setSwing(amount);
        });
        
        this.eventBus.addEventListener('loop-settings-load', (e) => {
            const { enabled, start, end, quantize, grid, swing } = e.detail;
            this.setLoopEnabled(enabled);
            this.setLoopBounds(start, end);
            this.setQuantization(quantize, grid);
            this.setSwing(swing || 0);
        });
    }

    // --- Public API Methods ---

    toggleLoop() {
        this.setLoopEnabled(!this.isLoopEnabled);
    }

    setLoopEnabled(enabled) {
        this.isLoopEnabled = enabled;
        console.log(`[LoopManager] Loop ${enabled ? 'enabled' : 'disabled'}`);
        
        // Emit loop state change event
        this.eventBus.dispatchEvent(new CustomEvent('loop-state-changed', {
            detail: {
                enabled: this.isLoopEnabled,
                start: this.loopStart,
                end: this.loopEnd
            }
        }));
    }

    setQuantization(enabled, gridValue) {
        this.quantizeEnabled = enabled;
        if (gridValue !== undefined) {
            this.quantizeGridValue = gridValue;
        }
        console.log(`[LoopManager] Quantization ${enabled ? 'enabled' : 'disabled'}`);
        
        // Emit quantization change event
        this.eventBus.dispatchEvent(new CustomEvent('quantization-changed', {
            detail: {
                enabled: this.quantizeEnabled,
                gridValue: this.quantizeGridValue
            }
        }));
    }

    setLoopBounds(start, end) {
        this.loopStart = Math.max(0, start);
        this.loopEnd = Math.max(this.loopStart, end);
        console.log(`[LoopManager] Loop bounds set: ${this.loopStart.toFixed(2)}s - ${this.loopEnd.toFixed(2)}s`);
        
        // Emit loop bounds change event
        this.eventBus.dispatchEvent(new CustomEvent('loop-bounds-changed', {
            detail: {
                start: this.loopStart,
                end: this.loopEnd
            }
        }));
    }

    autoDetectLoopBounds() {
        const seq = this.state.seq || [];
        if (seq.length === 0) {
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
        
        // Emit loop cleared event
        this.eventBus.dispatchEvent(new CustomEvent('loop-cleared'));
    }

    setMaxLoops(count) {
        this.maxLoops = count;
    }

    setQuantizationGrid(gridKey) {
        const gridMap = { 
            'whole': 4, 
            'half': 2, 
            'quarter': 1, 
            'eighth': 0.5, 
            'sixteenth': 0.25, 
            'thirtysecond': 0.125 
        };
        this.quantizeGridValue = gridMap[gridKey] || 0.125;
        
        // Emit grid change event
        this.eventBus.dispatchEvent(new CustomEvent('quantization-grid-changed', {
            detail: { gridValue: this.quantizeGridValue, gridKey }
        }));
    }

    getQuantizeGridKey() {
        const keyMap = { 
            4: 'whole', 
            2: 'half', 
            1: 'quarter', 
            0.5: 'eighth', 
            0.25: 'sixteenth', 
            0.125: 'thirtysecond' 
        };
        return keyMap[this.quantizeGridValue] || 'thirtysecond';
    }

    setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        
        // Emit swing change event
        this.eventBus.dispatchEvent(new CustomEvent('swing-changed', {
            detail: { amount: this.swingAmount }
        }));
    }

    setTempoConversion(original, target) {
        this.originalTempo = original;
        this.targetTempo = target;
        
        // Emit tempo change event
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
    
    /**
     * Quantize a time value to the current grid
     */
    quantizeTime(time) {
        if (!this.quantizeEnabled) return time;
        
        const grid = this.quantizeGridValue;
        let quantized = Math.round(time / grid) * grid;
        
        // Apply swing if enabled
        if (this.swingAmount > 0) {
            const beatPosition = (quantized / grid) % 2;
            if (beatPosition === 1) { // Off-beat
                quantized += grid * this.swingAmount * 0.1;
            }
        }
        
        return quantized;
    }
    
    /**
     * Get current loop settings for saving
     */
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
    
    /**
     * Cleanup method
     */
    destroy() {
        this.scheduledEvents = [];
        // Event listeners will be cleaned up when eventBus is destroyed
    }
}

export default LoopManager;

