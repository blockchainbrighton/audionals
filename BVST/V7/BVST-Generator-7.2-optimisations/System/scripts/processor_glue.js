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
        } else if (event.data.type === 'GET_DESCRIPTOR') {
            if (this.synth && typeof BvstSynth.get_descriptor === 'function') {
                this.port.postMessage({ type: 'DESCRIPTOR', descriptor: BvstSynth.get_descriptor() });
            }
        } else if (event.data.type === 'GET_STATE') {
            if (this.synth && typeof this.synth.get_state === 'function') {
                this.port.postMessage({ type: 'STATE', state: this.synth.get_state() });
            }
        } else if (event.data.type === 'SET_STATE') {
            if (this.synth && typeof this.synth.set_state === 'function') {
                this.synth.set_state(event.data.state);
            }
        } else if (event.data.type === 'LOAD_SAMPLE') {
            if (this.synth && typeof this.synth.load_sample === 'function') {
                try {
                    // Expects event.data.samples to be a Float32Array
                    // And potentially event.data.id if multiple slots supported (future proof)
                    this.synth.load_sample(event.data.samples);
                    this.port.postMessage({ type: 'STATUS', msg: "Sample Loaded" });
                } catch (e) {
                    console.error("BVST: load_sample failed", e);
                    this.port.postMessage({ type: 'ERROR', error: "Sample Load Failed: " + e.message });
                }
            } else {
                console.warn("BVST: Received LOAD_SAMPLE but synth does not support it.");
            }
        } else if (event.data.type === 'NOTE_ON') {
            if (this.synth && typeof this.synth.note_on === 'function') {
                this.synth.note_on(event.data.note, event.data.velocity);
            }
        } else if (event.data.type === 'NOTE_OFF') {
            if (this.synth && typeof this.synth.note_off === 'function') {
                this.synth.note_off(event.data.note);
            }
        } else if (event.data.type === 'MIDI_CC') {
            if (this.synth && typeof this.synth.midi_cc === 'function') {
                this.synth.midi_cc(event.data.cc, event.data.value);
            }
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
                // Check arity of the process function to support old (Mono) and new (Stereo) styles.
                if (this.synth.process.length === 4) {
                    // Stereo: process(inL, inR, outL, outR)
                    // If host is Mono output, we just pass outL twice or dummy? 
                    // Ideally we pass a dummy buffer for R if output is mono but synth wants stereo.
                    // But WebAudio defaults to Stereo usually.
                    let targetR = outR ? outR : this.dummyInput;
                    this.synth.process(inL, inR, outL, targetR);
                } else if (this.synth.process.length >= 2) {
                    // Mono: process(in, out)
                    this.synth.process(inL, outL);
                    // Copy to R if available
                    if (outR) outR.set(outL);
                } else {
                    // Legacy: process(out)
                    this.synth.process(outL);
                    if (outR) outR.set(outL);
                }
            } catch (e) {
                // console.error(e); // Avoid spamming console in audio thread
                return true;
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);
