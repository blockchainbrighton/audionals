/**
 * Shared Knob Controller
 * Handles drag-to-rotate interaction for synth UI knobs.
 */
export class KnobControl {
    constructor(selector = '.knob', options = {}) {
        this.selector = selector;
        this.onChange = options.onChange || ((id, value) => console.log(id, value));
        
        this.activeKnob = null;
        this.startY = 0;
        this.startVal = 0;

        this.init();
    }

    init() {
        // Attach to existing DOM elements
        document.querySelectorAll(this.selector).forEach(el => {
            this.updateVisual(el);
            
            el.addEventListener('mousedown', (e) => this.handleDown(e, el));
            // Touch support
            el.addEventListener('touchstart', (e) => this.handleDown(e, el));
        });

        // Global move/up handlers
        window.addEventListener('mousemove', (e) => this.handleMove(e));
        window.addEventListener('mouseup', () => this.handleUp());
        
        window.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        window.addEventListener('touchend', () => this.handleUp());
    }

    handleDown(e, el) {
        e.preventDefault(); // Prevent text selection
        this.activeKnob = el;
        
        // Unified coordinate
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        this.startY = clientY;
        this.startVal = parseFloat(el.dataset.val || el.dataset.value || 0); // Support both conventions
        
        document.body.style.cursor = 'ns-resize';
    }

    handleMove(e) {
        if (!this.activeKnob) return;
        e.preventDefault();

        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = this.startY - clientY; // Up is positive drag
        
        const el = this.activeKnob;
        
        // Params
        const min = parseFloat(el.dataset.min || 0);
        const max = parseFloat(el.dataset.max || 100);
        const step = parseFloat(el.dataset.step || 0); // 0 = continuous
        const sensitivity = 200; // Pixels for full range

        // Calculate raw normalized delta (0-1 range change)
        const range = max - min;
        const change = (delta / sensitivity) * range;
        
        let newVal = this.startVal + change;
        
        // Clamp
        newVal = Math.max(min, Math.min(max, newVal));
        
        // Snap to step
        if (step > 0) {
            newVal = Math.round(newVal / step) * step;
        }

        // Precision fix
        newVal = parseFloat(newVal.toFixed(4));

        // Update DOM state
        el.dataset.val = newVal;
        el.dataset.value = newVal;

        // Visual & Callback
        this.updateVisual(el);
        
        // Callback with ID and Value
        if (this.onChange) {
            this.onChange(el.id, newVal);
        }
    }

    handleUp() {
        if(this.activeKnob) {
            this.activeKnob = null;
            document.body.style.cursor = '';
        }
    }

    updateVisual(el) {
        const val = parseFloat(el.dataset.val || el.dataset.value || 0);
        const min = parseFloat(el.dataset.min || 0);
        const max = parseFloat(el.dataset.max || 100);
        const isLog = el.dataset.log === 'true';
        
        let percent = 0;
        
        if (isLog) {
            // Avoid log(0)
            const safeMin = min === 0 ? 0.001 : min;
            const safeVal = val === 0 ? 0.001 : val;
            percent = (Math.log(safeVal) - Math.log(safeMin)) / (Math.log(max) - Math.log(safeMin));
        } else {
            percent = (val - min) / (max - min);
        }
        
        // Clamp visual
        percent = Math.max(0, Math.min(1, percent));

        // Standard synth knob range: -135deg to +135deg (270deg travel)
        const deg = -135 + (percent * 270);
        el.style.transform = `rotate(${deg}deg)`;
    }
    
    // Helper to programmatically set a knob
    setValue(id, value) {
        const el = document.getElementById(id);
        if(el && el.matches(this.selector)) {
            el.dataset.val = value;
            el.dataset.value = value;
            this.updateVisual(el);
        }
    }
}
