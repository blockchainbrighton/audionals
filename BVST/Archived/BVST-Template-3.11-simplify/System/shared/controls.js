export class Controls {
    constructor(options = {}) {
        this.knobSelector = options.knobSelector || '.knob';
        this.sliderSelector = options.sliderSelector || '.slider';
        this.switchSelector = options.switchSelector || '.switch';
        this.buttonSelector = options.buttonSelector || '.button';
        
        this.onChange = options.onChange || ((id, value) => {});
        
        this.activeControl = null;
        this.startPos = { x: 0, y: 0 };
        this.startVal = 0;

        if (options.injectStyles !== false) {
            this.injectStyles();
        }
        this.init();
    }

    injectStyles() {
        const styleId = 'bvst-controls-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* --- KNOBS --- */
            .knob-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            }
            .knob-outer {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #222;
                border: 2px solid #444;
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                cursor: ns-resize;
            }
            .knob-track {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #1a1a1a;
                position: relative;
            }
            .knob {
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
            }
            .knob::after {
                content: '';
                position: absolute;
                top: 5px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 12px;
                background: #0f0;
                border-radius: 2px;
                box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
            }
            .knob-value {
                font-family: monospace;
                font-size: 10px;
                color: #0f0;
                margin-top: -2px;
                user-select: none;
            }

            /* --- SLIDERS (Faders) --- */
            .slider-container {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 5px;
            }
            .slider-track {
                background: #111;
                border: 1px solid #333;
                border-radius: 4px;
                position: relative;
                cursor: pointer;
            }
            
            /* Vertical Slider */
            .slider-track:not(.horizontal) {
                width: 12px;
                height: 150px;
                cursor: ns-resize;
            }
            .slider-handle {
                background: #444;
                border: 1px solid #666;
                border-radius: 2px;
                position: absolute;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                pointer-events: none; /* Events caught by track */
            }
            .slider-track:not(.horizontal) .slider-handle {
                width: 30px;
                height: 15px;
                left: 50%;
                transform: translateX(-50%);
                bottom: 0;
            }
            .slider-track:not(.horizontal) .slider-handle::after {
                content: '';
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 20px; height: 2px;
                background: #0f0;
            }

            /* Horizontal Slider */
            .slider-track.horizontal {
                width: 150px;
                height: 12px;
                cursor: ew-resize;
            }
            .slider-track.horizontal .slider-handle {
                width: 15px;
                height: 30px;
                top: 50%;
                transform: translateY(-50%);
                left: 0;
            }
            .slider-track.horizontal .slider-handle::after {
                content: '';
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 2px; height: 20px;
                background: #0f0;
            }

            /* --- SWITCHES --- */
            .switch-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                margin: 5px;
            }
            .switch-track {
                width: 40px;
                height: 20px;
                background: #222;
                border: 1px solid #444;
                border-radius: 10px;
                position: relative;
                transition: background 0.2s;
            }
            .switch-track.active {
                background: #050;
                border-color: #0a0;
            }
            .switch-handle {
                width: 16px;
                height: 16px;
                background: #888;
                border-radius: 50%;
                position: absolute;
                top: 1px;
                left: 1px;
                transition: left 0.2s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            .switch-track.active .switch-handle {
                left: 21px;
                background: #fff;
                box-shadow: 0 0 5px #0f0;
            }

            /* --- BUTTONS --- */
            .button-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 5px;
            }
            .button {
                width: 40px;
                height: 40px;
                background: #333;
                border: 2px solid #555;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
                color: #aaa;
                transition: all 0.1s;
                user-select: none;
            }
            .button:active, .button.active {
                background: #0f0;
                color: #000;
                border-color: #0a0;
                box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                transform: scale(0.95);
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    init() {
        this.attachListeners();
        // Update all visuals initially
        document.querySelectorAll(this.knobSelector).forEach(el => this.updateKnobVisual(el));
        document.querySelectorAll(this.sliderSelector).forEach(el => this.updateSliderVisual(el));
        document.querySelectorAll(this.switchSelector).forEach(el => this.updateSwitchVisual(el));
    }

    attachListeners() {
        // Global move/up for dragging
        window.addEventListener('mousemove', (e) => this.handleMove(e));
        window.addEventListener('mouseup', () => this.handleUp());
        window.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        window.addEventListener('touchend', () => this.handleUp());

        // Knobs
        document.querySelectorAll(this.knobSelector).forEach(el => {
            const handler = (e) => this.handleDown(e, el, 'knob');
            el.addEventListener('mousedown', handler);
            el.addEventListener('touchstart', handler, { passive: false });
        });

        // Sliders
        document.querySelectorAll(this.sliderSelector).forEach(el => {
            // Usually the selector is the handle or track. 
            // Let's assume the user puts the class on the container or the track.
            // For this CSS, the listener should probably be on the track.
            const handler = (e) => this.handleDown(e, el, 'slider');
            el.addEventListener('mousedown', handler);
            el.addEventListener('touchstart', handler, { passive: false });
        });

        // Switches
        document.querySelectorAll(this.switchSelector).forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSwitch(el);
            });
        });

        // Buttons (Momentary)
        document.querySelectorAll(this.buttonSelector).forEach(el => {
            const press = (e) => {
                e.preventDefault();
                this.triggerButton(el, 1);
            };
            const release = (e) => {
                e.preventDefault();
                this.triggerButton(el, 0);
            };
            
            el.addEventListener('mousedown', press);
            el.addEventListener('mouseup', release);
            el.addEventListener('mouseleave', release);
            
            el.addEventListener('touchstart', press, { passive: false });
            el.addEventListener('touchend', release);
        });
    }

    // --- Interaction Handlers ---

    handleDown(e, el, type) {
        e.preventDefault();
        this.activeControl = { el, type };
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        this.startPos = { x: clientX, y: clientY };
        this.startVal = parseFloat(el.dataset.value || el.dataset.val || 0);
        
        document.body.style.cursor = type === 'knob' || (!el.classList.contains('horizontal') && type === 'slider') 
            ? 'ns-resize' 
            : 'ew-resize';
    }

    handleMove(e) {
        if (!this.activeControl) return;
        e.preventDefault(); // Stop scroll

        const { el, type } = this.activeControl;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const min = parseFloat(el.dataset.min || 0);
        const max = parseFloat(el.dataset.max || 100);
        const step = parseFloat(el.dataset.step || 0);
        const isLog = el.dataset.curve === 'log';
        
        let newVal;

        if (type === 'knob') {
            const deltaY = this.startPos.y - clientY; // Up is positive
            
            if (isLog) {
                const normStart = this.valToNorm(this.startVal, min, max);
                let norm = normStart + (deltaY / 200);
                norm = Math.max(0, Math.min(1, norm));
                newVal = this.normToVal(norm, min, max);
            } else {
                const range = max - min;
                const change = (deltaY / 200) * range;
                newVal = this.startVal + change;
                newVal = Math.max(min, Math.min(max, newVal));
            }
        } else if (type === 'slider') {
            const range = max - min;
            let change = 0;
            if (el.classList.contains('horizontal')) {
                const deltaX = clientX - this.startPos.x; // Right is positive
                change = (deltaX / 150) * range;
            } else {
                const deltaY = this.startPos.y - clientY; // Up is positive
                change = (deltaY / 150) * range;
            }
            newVal = this.startVal + change;
            newVal = Math.max(min, Math.min(max, newVal));
        }

        // Step
        if (step > 0) {
            newVal = Math.round(newVal / step) * step;
        }
        
        // Precision
        if (step < 1 && step > 0) {
            const precision = step.toString().split('.')[1]?.length || 2;
            newVal = parseFloat(newVal.toFixed(precision));
        } else {
            newVal = parseFloat(newVal.toFixed(2));
        }
        
        // Update State
        if (parseFloat(el.dataset.value || el.dataset.val) !== newVal) {
            el.dataset.value = newVal;
            el.dataset.val = newVal;
            
            // Update Visuals
            if (type === 'knob') this.updateKnobVisual(el);
            else this.updateSliderVisual(el);
            
            // Callback
            if (this.onChange) this.onChange(el.id, newVal);
        }
    }

    handleUp() {
        if (this.activeControl) {
            this.activeControl = null;
            document.body.style.cursor = '';
        }
    }

    toggleSwitch(el) {
        const current = parseInt(el.dataset.value || 0);
        const newVal = current === 0 ? 1 : 0;
        
        el.dataset.value = newVal;
        el.dataset.val = newVal;
        
        this.updateSwitchVisual(el);
        if (this.onChange) this.onChange(el.id, newVal);
    }

    triggerButton(el, val) {
        // Avoid repeated triggers if already in state
        const current = parseInt(el.dataset.value || 0);
        if (current === val) return;
        
        el.dataset.value = val;
        el.dataset.val = val;
        
        if (val === 1) el.classList.add('active');
        else el.classList.remove('active');
        
        if (this.onChange) this.onChange(el.id, val);
    }

    // --- Visual Updaters ---

    updateKnobVisual(el) {
        const val = parseFloat(el.dataset.value || el.dataset.val || 0);
        const min = parseFloat(el.dataset.min || 0);
        const max = parseFloat(el.dataset.max || 100);
        const isLog = el.dataset.curve === 'log';
        
        let percent;
        if (isLog) {
            percent = this.valToNorm(val, min, max);
        } else {
            percent = (val - min) / (max - min);
        }
        percent = Math.max(0, Math.min(1, percent));
        
        const deg = -135 + (percent * 270);
        el.style.transform = `rotate(${deg}deg)`;

        // Value display
        const container = el.closest('.knob-container');
        if (container) {
            const valDisplay = container.querySelector('.knob-value');
            if (valDisplay) valDisplay.innerText = val;
        }
    }

    updateSliderVisual(el) {
        const val = parseFloat(el.dataset.value || 0);
        const min = parseFloat(el.dataset.min || 0);
        const max = parseFloat(el.dataset.max || 100);
        
        let percent = (val - min) / (max - min);
        percent = Math.max(0, Math.min(1, percent));

        // Assuming structure: .slider-track > .slider-handle
        const handle = el.querySelector('.slider-handle');
        if (!handle) return;

        if (el.classList.contains('horizontal')) {
            handle.style.left = `${percent * 100}%`;
        } else {
            handle.style.bottom = `${percent * 100}%`;
        }
    }

    updateSwitchVisual(el) {
        const val = parseInt(el.dataset.value || 0);
        // Assumes .switch-track structure
        if (val === 1) el.classList.add('active');
        else el.classList.remove('active');
    }

    // --- Helpers ---
    valToNorm(val, min, max) {
        // If range crosses 0 or is negative, Log is tricky. 
        // Assuming positive range for freq (20-20000).
        // Fallback to linear if min <= 0
        if (min <= 0) return (val - min) / (max - min);
        const r = max / min;
        return Math.log(val / min) / Math.log(r);
    }

    normToVal(norm, min, max) {
        if (min <= 0) return min + norm * (max - min);
        const r = max / min;
        return min * Math.pow(r, norm);
    }

    // --- Public API ---
    setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        
        el.dataset.value = value;
        el.dataset.val = value;
        
        if (el.matches(this.knobSelector)) this.updateKnobVisual(el);
        else if (el.matches(this.sliderSelector)) this.updateSliderVisual(el);
        else if (el.matches(this.switchSelector)) this.updateSwitchVisual(el);
        else if (el.matches(this.buttonSelector)) {
             if(value) el.classList.add('active');
             else el.classList.remove('active');
        }
    }
}