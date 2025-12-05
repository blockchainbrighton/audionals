// --- BVST AudioWorkletProcessor ---
// This code is appended to the wasm-bindgen output.

class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.port.onmessage = this.handleMessage.bind(this);
        this.dummyInput = new Float32Array(128); // Fallback for silence
        console.log("BVST: Processor constructed.");
    }

    async handleMessage(event) {
        if (event.data.type === 'INIT_WASM') {
            console.log("BVST: Initializing WASM...");
            try {
                // 'init' is defined in the generated code.
                // Support both wasm-bindgen default export (__wbg_init) and older init symbol.
                const wasmInit = (typeof init !== 'undefined') ? init : (typeof __wbg_init !== 'undefined' ? __wbg_init : null);
                if (!wasmInit) {
                    throw new Error("WASM init function not found (expected 'init' or '__wbg_init').");
                }
                await wasmInit(event.data.wasmBytes);
                
                // Try to instantiate the engine.
                // Backward compatibility: Look for BvstSynth
                if (typeof BvstSynth !== 'undefined') {
                    this.synth = BvstSynth.new(sampleRate);
                    console.log("BVST: BvstSynth instantiated.");
                } else {
                    throw new Error("BvstSynth class not found in WASM exports.");
                }
                
                this.port.postMessage({ type: 'READY' });
            } catch (e) {
                console.error("BVST: Init error", e);
                this.port.postMessage({ type: 'ERROR', error: e.toString() });
            }
        } else if (event.data.type === 'PARAM') {
            if (this.synth) {
                this.synth.set_param(event.data.id, event.data.value);
            }
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || output.length === 0) return true;
        
        const outChannel0 = output[0];
        
        // Get Input
        let inChannel0 = this.dummyInput;
        if (inputs.length > 0 && inputs[0].length > 0) {
            inChannel0 = inputs[0][0];
        }
        
        // Ensure dummy buffer size matches block size (WebAudio is usually 128, but strictly not guaranteed)
        if (inChannel0 === this.dummyInput && this.dummyInput.length !== outChannel0.length) {
            this.dummyInput = new Float32Array(outChannel0.length);
            inChannel0 = this.dummyInput;
        }

        if (this.synth) {
            try {
                // Check arity of the process function to support both old (Synth) and new (FX) styles.
                // Old: process(output)
                // New: process(input, output)
                if (this.synth.process.length >= 2) {
                    this.synth.process(inChannel0, outChannel0);
                } else {
                    this.synth.process(outChannel0);
                }
            } catch (e) {
                // console.error(e); // Avoid spamming console in audio thread
                return true;
            }
            
            // Copy to other channels if stereo output requested but mono computed
            // (Though if Rust computes stereo, we'd pass two channels. 
            // Current architecture seems Mono-focused for generic 'process').
            for (let i = 1; i < output.length; i++) {
                output[i].set(outChannel0);
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);
