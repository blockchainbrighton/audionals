export class SynthKeyboard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`SynthKeyboard: Container element #${containerId} not found.`);
            return;
        }

        // Options with defaults
        this.startNote = options.startNote || 48; // C3
        // If numKeys is not provided, default to 25, but allow responsive overrides
        this.numKeys = options.numKeys || 25;
        this.responsive = options.responsive || false;
        
        this.onNoteOn = options.onNoteOn || ((midi) => console.log('Note On:', midi));
        this.onNoteOff = options.onNoteOff || ((midi) => console.log('Note Off:', midi));

        // Internal state for glissando/drag tracking
        this.activeKeys = [];

        this.injectStyles();

        if (this.responsive) {
            this.setupResponsive();
        } else {
            this.render();
        }
    }

    setupResponsive() {
        // Initial calc
        this.updateKeyCount();

        // Watch for resize
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                // Debounce/Throttle slightly or just run
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
        const availableWhiteKeys = Math.floor((width - 20) / WHITE_KEY_WIDTH); // -20 padding safety
        
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

    injectStyles() {
        const styleId = 'synth-keyboard-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* KEYBOARD STYLES injected by SynthKeyboard */
            #keyboard-container {
                width: 100%;
                display: flex;
                justify-content: center;
            }
            
            .synth-keyboard {
                display: flex;
                height: 100px;
                background: #111;
                justify-content: center;
                position: relative;
                margin-top: 10px;
                padding: 10px 0;
                border-top: 4px solid #222;
                user-select: none;
                width: 100%; 
            }
            
            .key {
                position: relative;
                width: 40px; /* Fixed Width */
                height: 100%;
                background: var(--key-white, #fffff0);
                border: 1px solid #999;
                border-radius: 0 0 4px 4px;
                margin: 0 1px;
                cursor: pointer;
                z-index: 1;
                box-sizing: border-box;
            }
            
            .key.black {
                width: 24px;
                height: 60%;
                background: var(--key-black, #151515);
                /* Negative Margins for Overlay */
                margin-left: -13px;
                margin-right: -13px;
                z-index: 2;
                border: 1px solid #000;
                border-radius: 0 0 2px 2px;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
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

    render() {
        this.container.innerHTML = '';
        // Ensure the container has the class if it's not the direct styled element
        // In the original CSS, #keyboard had the flex styles. 
        // We'll add the class to the container.
        this.container.classList.add('synth-keyboard');
        
        const keyNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        
        for(let i=0; i < this.numKeys; i++) {
            const midi = this.startNote + i;
            const noteName = keyNames[i % 12];
            const isBlack = noteName.includes('#');
            
            const div = document.createElement('div');
            div.className = `key ${isBlack ? 'black' : 'white'}`;
            div.dataset.midi = midi;
            
            // Event Handlers
            const on = () => this._handleNoteOn(midi);
            const off = () => this._handleNoteOff(midi);
            
            div.onmousedown = on;
            div.onmouseup = off;
            div.onmouseleave = off;
            div.onmouseenter = (e) => { 
                if(e.buttons === 1) on(); 
            };
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

    _handleNoteOn(midi) {
        if (this.activeKeys.includes(midi)) return;
        this.activeKeys.push(midi);
        this.setKeyVisual(midi, true);
        this.onNoteOn(midi);
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
