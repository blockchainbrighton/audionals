// --- BVST AudioWorkletProcessor ---
// This code is appended to the wasm-bindgen output.

class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.port.onmessage = this.handleMessage.bind(this);
        console.log("BVST: Processor constructed.");
    }

    async handleMessage(event) {
        if (event.data.type === 'INIT_WASM') {
            console.log("BVST: Initializing WASM...");
            try {
                // 'init' is defined in the generated code above.
                // We pass the bytes directly.
                await init(event.data.wasmBytes);
                
                // Create the synth instance
                // 'BvstSynth' is defined in the generated code above.
                this.synth = BvstSynth.new(sampleRate);
                
                console.log("BVST: Synth ready.");
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
        
        const channel0 = output[0];

        if (this.synth) {
            this.synth.process(channel0);
            
            // Copy to other channels
            for (let i = 1; i < output.length; i++) {
                output[i].set(channel0);
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);
