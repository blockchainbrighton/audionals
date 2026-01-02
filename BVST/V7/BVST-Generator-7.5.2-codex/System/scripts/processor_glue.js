// --- BVST AudioWorkletProcessor ---
// This code is appended to the wasm-bindgen output.

class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.port.onmessage = this.handleMessage.bind(this);
        this.dummyInput = new Float32Array(128); // Fallback for silence
        this._reportedWorkletError = false;
        this._eventQueue = [];
        this._queueReadIndex = 0;
        this._maxQueuedEvents = 2048;
        this._maxEventsPerBlock = 256;
        if (globalThis.BVST_DEBUG) console.log("BVST: Processor constructed.");
    }

    _reportWorkletError(context, e) {
        // Avoid spamming console / UI from the audio thread.
        if (this._reportedWorkletError) return;
        this._reportedWorkletError = true;

        const msg = (e && e.message) ? e.message : String(e);
        console.error(`BVST: Worklet error (${context})`, e);
        try {
            this.port.postMessage({ type: 'ERROR', error: `${context}: ${msg}` });
        } catch (_) {}
    }

    _enqueueEvent(data) {
        if (!data || typeof data.type !== 'string') return;
        this._eventQueue.push(data);

        const overflow = this._eventQueue.length - this._maxQueuedEvents;
        if (overflow > 0) {
            // Drop oldest queued events; keep the most recent tail.
            this._eventQueue.splice(0, overflow);
            this._queueReadIndex = Math.max(0, this._queueReadIndex - overflow);
        }
    }

    _drainEventQueue() {
        if (!this.synth) return;

        const queue = this._eventQueue;
        let idx = this._queueReadIndex;
        const end = queue.length;

        let processed = 0;
        while (idx < end && processed < this._maxEventsPerBlock) {
            const evt = queue[idx++];
            processed++;

            try {
                if (evt.type === 'PARAM') {
                    this.synth.set_param(evt.id, evt.value);
                } else if (evt.type === 'GET_DESCRIPTOR') {
                    if (typeof BvstSynth?.get_descriptor === 'function') {
                        this.port.postMessage({ type: 'DESCRIPTOR', descriptor: BvstSynth.get_descriptor() });
                    }
                } else if (evt.type === 'GET_STATE') {
                    if (typeof this.synth.get_state === 'function') {
                        this.port.postMessage({ type: 'STATE', state: this.synth.get_state() });
                    }
                } else if (evt.type === 'SET_STATE') {
                    if (typeof this.synth.set_state === 'function') {
                        this.synth.set_state(evt.state);
                    }
                } else if (evt.type === 'LOAD_SAMPLE') {
                    if (typeof this.synth.load_sample === 'function') {
                        this.synth.load_sample(evt.samples);
                        this.port.postMessage({ type: 'STATUS', msg: "Sample Loaded" });
                    }
                } else if (evt.type === 'NOTE_ON') {
                    if (typeof this.synth.note_on === 'function') {
                        const note = Number(evt.note);
                        const velocity = Number(evt.velocity);
                        if (Number.isFinite(note) && Number.isFinite(velocity)) {
                            this.synth.note_on(note, velocity);
                        }
                    }
                } else if (evt.type === 'NOTE_OFF') {
                    if (typeof this.synth.note_off === 'function') {
                        const note = Number(evt.note);
                        if (Number.isFinite(note)) {
                            this.synth.note_off(note);
                        }
                    }
                } else if (evt.type === 'MIDI_CC') {
                    if (typeof this.synth.midi_cc === 'function') {
                        const cc = Number(evt.cc);
                        const value = Number(evt.value);
                        if (Number.isFinite(cc) && Number.isFinite(value)) {
                            this.synth.midi_cc(cc, value);
                        }
                    }
                }
            } catch (e) {
                this._reportWorkletError(evt.type, e);
            }
        }

        this._queueReadIndex = idx;
        if (this._queueReadIndex > 0 && this._queueReadIndex >= queue.length) {
            queue.length = 0;
            this._queueReadIndex = 0;
        } else if (this._queueReadIndex > 0 && this._queueReadIndex > 256) {
            queue.splice(0, this._queueReadIndex);
            this._queueReadIndex = 0;
        }
    }

    async handleMessage(event) {
        if (event.data.type === 'INIT_WASM') {
            if (globalThis.BVST_DEBUG) console.log("BVST: Initializing WASM...");
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
                    const srCandidate =
                        (typeof sampleRate === 'number' && Number.isFinite(sampleRate) && sampleRate > 0)
                            ? sampleRate
                            : (typeof globalThis !== 'undefined' &&
                               typeof globalThis.sampleRate === 'number' &&
                               Number.isFinite(globalThis.sampleRate) &&
                               globalThis.sampleRate > 0)
                                  ? globalThis.sampleRate
                                  : 48000;

                    this.synth = BvstSynth.new(srCandidate);
                    if (globalThis.BVST_DEBUG) console.log("BVST: BvstSynth instantiated.");
                } else {
                    throw new Error("BvstSynth class not found in WASM exports.");
                }
                
                this.port.postMessage({ type: 'READY' });
            } catch (e) {
                console.error("BVST: Init error", e);
                this.port.postMessage({ type: 'ERROR', error: e.toString() });
            }
        } else {
            // Never call into WASM directly from message handlers; enqueue and apply at the start of process()
            // to avoid re-entrant mutable borrows (wasm-bindgen "recursive use of an object" errors).
            this._enqueueEvent(event.data);
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
                this._drainEventQueue();
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
                this._reportWorkletError('PROCESS', e);
                try { this.synth.free?.(); } catch (_) {}
                this.synth = null;
                this._eventQueue.length = 0;
                this._queueReadIndex = 0;
                return true;
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);
