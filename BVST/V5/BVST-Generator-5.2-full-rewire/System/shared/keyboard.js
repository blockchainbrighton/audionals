export class Keyboard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Keyboard: Container element #${containerId} not found.`);
            return;
        }

        // Options with defaults
        this.startNote = options.startNote || (options.startOctave ? (options.startOctave + 1) * 12 : 48); 
        // Backward compatibility for 'octaves' option if 'numKeys' not present
        if (!options.numKeys && options.octaves) {
            this.numKeys = options.octaves * 12;
        } else {
            this.numKeys = options.numKeys || 25;
        }
        
        this.responsive = options.responsive || false;
        this.width = options.width || '100%';
        
        // Callback wrappers to handle freq conversion if needed
        this.onNoteOn = options.onNoteOn || ((midi, freq) => {});
        this.onNoteOff = options.onNoteOff || ((midi) => {});

        // Internal state for glissando/drag tracking
        this.activeKeys = [];

        this.injectStyles();

        // Apply container width
        this.container.style.width = this.width;

        if (this.responsive) {
            this.setupResponsive();
        } else {
            this.render();
        }
    }

    mtof(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    setupResponsive() {
        // Initial calc
        this.updateKeyCount();

        // Watch for resize
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentBoxSize) {
                    this.updateKeyCount();
                }
            }
        });
        ro.observe(this.container);
    }

    updateKeyCount() {
        if (!this.container) return;
        // Use clientWidth to get available inner width
        const width = this.container.clientWidth;
        if (width === 0) return;

        // Effective width of a white key: 40px width + 2px margin (0 1px)
        const WHITE_KEY_WIDTH = 42;
        // Reduce slightly to avoid edge rounding issues causing wrap
        const availableWhiteKeys = Math.floor((width - 20) / WHITE_KEY_WIDTH); 
        
        if (availableWhiteKeys < 1) return;

        let whiteCount = 0;
        let chromaticCount = 0;
        let currentNote = this.startNote;
        const keyNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

        while (whiteCount < availableWhiteKeys) {
            const noteName = keyNames[currentNote % 12];
            const isBlack = noteName.includes('#');
            
            if (!isBlack) {
                whiteCount++;
            }
            
            chromaticCount++;
            currentNote++;
        }

        // Update if changed
        if (this.numKeys !== chromaticCount) {
            this.numKeys = chromaticCount;
            this.render();
        }
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.add('bvst-keyboard');
        
        const keyNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        
        // 1. Calculate Totals for Sizing
        let totalWhiteKeys = 0;
        for(let i=0; i < this.numKeys; i++) {
            const midi = this.startNote + i;
            const noteName = keyNames[midi % 12];
            if (!noteName.includes('#')) totalWhiteKeys++;
        }

        // 2. Calculate flexible width percentage
        // Ensure we don't divide by zero
        const whiteKeyWidthPct = totalWhiteKeys > 0 ? (100 / totalWhiteKeys) : 10;
        const blackKeyWidthPct = whiteKeyWidthPct * 0.65;
        const blackKeyMarginPct = blackKeyWidthPct / 2;

        for(let i=0; i < this.numKeys; i++) {
            const midi = this.startNote + i;
            const noteName = keyNames[midi % 12];
            const isBlack = noteName.includes('#');
            
            const div = document.createElement('div');
            div.className = `key ${isBlack ? 'black' : 'white'}`;
            div.dataset.midi = midi;
            div.title = `${noteName} (${midi})`;
            
            // Apply Dynamic Sizing
            if (isBlack) {
                div.style.width = `${blackKeyWidthPct}%`;
                div.style.marginLeft = `-${blackKeyMarginPct}%`;
                div.style.marginRight = `-${blackKeyMarginPct}%`;
                div.style.zIndex = 2;
            } else {
                div.style.width = `${whiteKeyWidthPct}%`;
                div.style.zIndex = 1;
            }

            // Event Handlers
            const on = () => this._handleNoteOn(midi);
            const off = () => this._handleNoteOff(midi);
            
            // Mouse
            div.onmousedown = (e) => {
                if (e.buttons === 1) on();
            };
            div.onmouseup = off;
            div.onmouseleave = off;
            div.onmouseenter = (e) => { 
                if(e.buttons === 1) on(); 
            };
            
            // Touch
            div.ontouchstart = (e) => { 
                e.preventDefault(); 
                on(); 
            };
            div.ontouchend = (e) => { 
                e.preventDefault(); 
                off(); 
            };
            
            this.container.appendChild(div);
        }
    }

    injectStyles() {
        const styleId = 'bvst-keyboard-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* KEYBOARD STYLES injected by Keyboard Module */
            .bvst-keyboard {
                display: flex;
                height: 120px;
                background: #111;
                justify-content: center; /* Keep centered if width < 100% */
                position: relative;
                margin-top: 10px;
                padding: 10px 0;
                border-top: 4px solid #222;
                user-select: none;
                -webkit-user-select: none;
                width: 100%; 
                box-sizing: border-box;
            }
            
            .key {
                position: relative;
                height: 100%;
                background: var(--key-white, #fffff0);
                border: 1px solid #999;
                border-radius: 0 0 4px 4px;
                /* Widths handled by JS for perfect fit */
                cursor: pointer;
                box-sizing: border-box;
            }
            
            .key.black {
                height: 60%;
                background: var(--key-black, #151515);
                border: 1px solid #000;
                border-radius: 0 0 2px 2px;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
                /* Z-index handled by JS */
            }
            
            .key.active {
                background: var(--accent, #ff9900);
                box-shadow: 0 0 15px var(--accent, #ff9900);
            }
            
            .key.black.active {
                background: #cc7a00; /* Darker orange */
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    _handleNoteOn(midi) {
        if (this.activeKeys.includes(midi)) return;
        this.activeKeys.push(midi);
        this.setKeyVisual(midi, true);
        this.onNoteOn(midi, this.mtof(midi));
    }

    _handleNoteOff(midi) {
        // Remove from active keys
        this.activeKeys = this.activeKeys.filter(k => k !== midi);
        this.setKeyVisual(midi, false);
        this.onNoteOff(midi);
    }

    setKeyVisual(midi, active) {
        const key = this.container.querySelector(`.key[data-midi="${midi}"]`);
        if (key) {
            if (active) key.classList.add('active');
            else key.classList.remove('active');
        }
    }
    
    // Public method to trigger visual feedback from external MIDI
    triggerVisual(midi, active) {
        this.setKeyVisual(midi, active);
    }
}

