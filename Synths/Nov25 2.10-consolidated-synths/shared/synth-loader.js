/**
 * Shared Loader for Ordinal-based Audio Libraries
 * Standardizes loading Tone.js and Three.js from on-chain inscriptions.
 */
export class SynthLoader {
    constructor(options = {}) {
        this.toneUrl = options.toneUrl || 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
        this.threeUrl = options.threeUrl || 'https://ordinals.com/content/0d013bb60fc5bf5a6c77da7371b07dc162ebc7d7f3af0ff3bd00ae5f0c546445i0';
        
        // DOM Elements
        this.loaderId = options.loaderId || 'loader-overlay';
        this.statusId = options.statusId || 'loader-status'; // Text element
        this.startBtnId = options.startBtnId || 'start-btn'; // The "Click to Start" button
        
        this.Tone = null;
        this.THREE = null;
    }

    /**
     * Loads libraries and waits for user interaction to start AudioContext.
     * @param {Function} onReady - Callback when libraries are loaded and start button is clicked.
     */
    async load(onReady) {
        this.updateStatus('Loading Audio Engine...');
        
        try {
            // 1. Load Tone.js
            const toneModule = await import(this.toneUrl);
            this.Tone = window.Tone || toneModule.default || toneModule;
            
            if (!this.Tone) throw new Error("Tone.js export not found");
            console.log(`[SynthLoader] Tone.js v${this.Tone.version} loaded.`);

            // 2. Optional: Load Three.js (in parallel if we wanted, but sequential for safety here)
            // We don't block strictly on Three.js failure unless critical
            try {
                const threeModule = await import(this.threeUrl);
                this.THREE = window.THREE || threeModule;
                console.log(`[SynthLoader] Three.js loaded.`);
            } catch (e) {
                console.warn("[SynthLoader] Three.js optional load skipped/failed.");
            }

            // 3. Ready for User Interaction
            this.updateStatus('System Ready.');
            this.showStartButton(async () => {
                // Start Audio Context
                await this.Tone.start();
                this.Tone.context.lookAhead = 0; // Low latency default
                console.log('[SynthLoader] Audio Context Resumed & Optimized.');
                
                // Hide Loader
                this.hideLoader();
                
                // Callback with loaded libs
                if (onReady) onReady({ 
                    Tone: this.Tone, 
                    THREE: this.THREE 
                });
            });

        } catch (err) {
            this.updateStatus('Load Failed: ' + err.message, true);
            console.error(err);
        }
    }

    updateStatus(msg, isError = false) {
        const el = document.getElementById(this.statusId);
        if (el) {
            el.innerText = msg;
            if (isError) el.style.color = 'red';
        }
    }

    showStartButton(onClick) {
        const btn = document.getElementById(this.startBtnId);
        if (btn) {
            btn.style.display = 'block'; // or 'flex' depending on CSS, block is safest default
            btn.onclick = onClick;
        } else {
            // If no button found, try to auto-start (likely blocked by browser policy, but worth a shot)
            console.warn("[SynthLoader] No start button found. Attempting auto-start.");
            onClick();
        }
    }

    hideLoader() {
        const el = document.getElementById(this.loaderId);
        if (el) {
            el.style.transition = 'opacity 0.5s';
            el.style.opacity = '0';
            setTimeout(() => el.style.display = 'none', 500);
        }
    }
}
