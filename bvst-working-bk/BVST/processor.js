// BVST Processor (Streamlined & Robust)

console.log("BVST: Worklet script loading...");

let wasm;

// --- WASM Memory Helpers (Lazy Init) ---

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let WASM_VECTOR_LEN = 0;

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

// --- String / TextDecoder Helpers ---

let cachedTextDecoder = null;
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;

function decodeText(ptr, len) {
    if (typeof TextDecoder === 'undefined') {
        return "TextDecoder unavailable"; 
    }
    if (!cachedTextDecoder) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
    }
    
    ptr = ptr >>> 0;
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr, len);
}

// --- BvstSynth Class ---

let BvstSynthFinalization = null;

class BvstSynth {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BvstSynth.prototype);
        obj.__wbg_ptr = ptr;
        
        if (!BvstSynthFinalization && typeof FinalizationRegistry !== 'undefined') {
            BvstSynthFinalization = new FinalizationRegistry(ptr => wasm.__wbg_bvstsynth_free(ptr >>> 0, 1));
        }

        if (BvstSynthFinalization) {
            BvstSynthFinalization.register(obj, obj.__wbg_ptr, obj);
        }
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        if (BvstSynthFinalization) {
            BvstSynthFinalization.unregister(this);
        }
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bvstsynth_free(ptr, 0);
    }

    static new(sample_rate) {
        const ret = wasm.bvstsynth_new(sample_rate);
        return BvstSynth.__wrap(ret);
    }

    process(output) {
        var ptr0 = passArrayF32ToWasm0(output, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.bvstsynth_process(this.__wbg_ptr, ptr0, len0, output);
    }

    set_param(param_id, value) {
        wasm.bvstsynth_set_param(this.__wbg_ptr, param_id, value);
    }
}

// --- AudioWorkletProcessor ---

try {
    class BvstProcessor extends AudioWorkletProcessor {
        constructor() {
            super();
            this.synth = null;
            this.port.onmessage = this.handleMessage.bind(this);
            console.log("BVST: Processor constructed.");
        }

        async handleMessage(event) {
            if (event.data.type === 'INIT_WASM') {
                console.log("BVST: Received WASM bytes. Instantiating...");
                try {
                    const imports = {
                        wbg: {
                            __wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1: (arg0, arg1, arg2) => {
                                new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
                            },
                            __wbg___wbindgen_throw_dd24417ed36fc46e: (arg0, arg1) => {
                                throw new Error(getStringFromWasm0(arg0, arg1));
                            },
                            __wbindgen_init_externref_table: () => {
                                const table = wasm.__wbindgen_externrefs;
                                const offset = table.grow(4);
                                table.set(0, undefined);
                                table.set(offset + 0, undefined);
                                table.set(offset + 1, null);
                                table.set(offset + 2, true);
                                table.set(offset + 3, false);
                            }
                        }
                    };

                    const { instance } = await WebAssembly.instantiate(event.data.wasmBytes, imports);
                    wasm = instance.exports;
                    
                    // Initialize WASM
                    if (wasm.__wbindgen_start) {
                        wasm.__wbindgen_start();
                    }

                    // Create Synth
                    this.synth = BvstSynth.new(sampleRate);
                    console.log("BVST: WASM Ready. Synth created.");
                    this.port.postMessage({ type: 'READY' });
                    
                } catch (e) {
                    console.error("BVST: WASM Init Error", e);
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
            
            // Output is an array of channels (Float32Array)
            const channel0 = output[0];

            if (this.synth) {
                this.synth.process(channel0);
                
                // Copy to other channels if stereo/multi-channel
                for (let i = 1; i < output.length; i++) {
                    output[i].set(channel0);
                }
            }

            return true;
        }
    }

    registerProcessor('bvst-processor', BvstProcessor);
    console.log("BVST: 'bvst-processor' registered successfully.");

} catch (err) {
    console.error("BVST: Top-level script error:", err);
}