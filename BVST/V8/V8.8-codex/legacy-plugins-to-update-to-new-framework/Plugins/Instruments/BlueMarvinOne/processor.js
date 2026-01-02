import init, { BvstSynth } from "../../../System/shared/wasm_loader_fx.js";

// --- BVST AudioWorkletProcessor ---
// Optimized to use shared WASM loader for FX/Hybrids (4-arg process)

class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.port.onmessage = this.handleMessage.bind(this);
        this.dummyInput = new Float32Array(128); // Fallback for silence
        console.log("BVST: Processor constructed (Shared FX Loader).");
    }

    async handleMessage(event) {
        if (event.data.type === 'INIT_WASM') {
            console.log("BVST: Initializing WASM via Shared FX Loader...");
            try {
                // Initialize WASM using the shared loader
                await init(event.data.wasmBytes);
                
                // Instantiate the synth using the shared BvstSynth class
                this.synth = BvstSynth.new(sampleRate);
                console.log("BVST: BvstSynth instantiated.");
                
                this.port.postMessage({ type: 'READY' });
            } catch (e) {
                console.error("BVST: Init error", e);
                this.port.postMessage({ type: 'ERROR', error: e.toString() });
            }
        } else if (event.data.type === 'PARAM') {
            if (this.synth) {
                this.synth.set_param(event.data.id, event.data.value);
            }
        } else if (event.data.type === 'LOAD_SAMPLE') {
            // FX/Hybrids typically don't load samples, but if they do, 
            // the shared FX loader might not support it unless extended.
            // BvstSynth in wasm_loader_fx.js does NOT currently have load_sample.
            console.warn("BVST: Received LOAD_SAMPLE but shared FX loader does not support it.");
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || output.length === 0) return true;
        
        // Get Input (Stereo support)
        let inL = this.dummyInput;
        let inR = this.dummyInput;
        
        if (inputs.length > 0 && inputs[0].length > 0) {
            inL = inputs[0][0];
            if (inputs[0].length > 1) {
                inR = inputs[0][1];
            } else {
                inR = inL; // Mono input doubled to R if needed
            }
        }
        
        // Get Output channels
        const outL = output[0];
        const outR = output.length > 1 ? output[1] : null;

        // Ensure dummy buffer size matches block size
        if (inL === this.dummyInput && this.dummyInput.length !== outL.length) {
            this.dummyInput = new Float32Array(outL.length);
            inL = this.dummyInput;
            inR = this.dummyInput;
        }

        if (this.synth) {
            try {
                // FX/Hybrids use 4-arg process in the shared loader
                let targetR = outR ? outR : this.dummyInput;
                this.synth.process(inL, inR, outL, targetR);
            } catch (e) {
                return true;
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);
