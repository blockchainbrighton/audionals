// --- BVST AudioWorkletProcessor ---
// This code is appended to the wasm-bindgen output.

class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.dummyInput = new Float32Array(128); 
        this.port.onmessage = this.handleMessage.bind(this);
        console.log("BVST: Processor constructed.");
    }

    async handleMessage(event) {
        if (event.data.type === 'INIT_WASM') {
            console.log("BVST: Initializing WASM...");
            try {
                await init(event.data.wasmBytes);
                
                // Use BvstEngine (generic name)
                const EngineClass = (typeof BvstEngine !== 'undefined') ? BvstEngine : BvstSynth;
                this.synth = EngineClass.new(sampleRate);
                
                console.log("BVST: Engine ready.");
                this.port.postMessage({ type: 'READY' });
            } catch (e) {
                console.error("BVST: Init error", e);
                this.port.postMessage({ type: 'ERROR', error: e.toString() });
            }
        } else if (event.data.type === 'PARAM') {
            if (this.synth) {
                this.synth.set_param(event.data.id, event.data.value);
            }
        } else if (event.data.type === 'SWITCH_SYNTH') {
            if (this.synth) {
                console.log(`BVST: Switching to synth ID ${event.data.id}`);
                this.synth.load_synth(event.data.id);
            }
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || output.length === 0) return true;
        
        const outputChannel0 = output[0];
        
        // Generic Input Handling
        let inputChannel0 = this.dummyInput;
        if (inputs.length > 0 && inputs[0].length > 0) {
            inputChannel0 = inputs[0][0];
        }
        
        // Resize dummy if needed
        if (inputChannel0.length !== outputChannel0.length) {
             if (inputChannel0 === this.dummyInput) {
                 this.dummyInput = new Float32Array(outputChannel0.length);
                 inputChannel0 = this.dummyInput;
             }
        }

        if (this.synth) {
            // The WASM process function now accepts (input, output)
            this.synth.process(inputChannel0, outputChannel0);
            
            // Simple mono-to-stereo copy
            for (let i = 1; i < output.length; i++) {
                output[i].set(outputChannel0);
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);