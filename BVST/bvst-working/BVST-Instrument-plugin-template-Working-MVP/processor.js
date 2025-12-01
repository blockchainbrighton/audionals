console.log("BVST: Global script starting...");
let wasm;

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => 'TextDecoder missing' };
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

const BvstEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bvstengine_free(ptr >>> 0, 1));

class BvstEngine {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BvstEngine.prototype);
        obj.__wbg_ptr = ptr;
        BvstEngineFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BvstEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bvstengine_free(ptr, 0);
    }
    /**
     * @param {number} id
     */
    load_synth(id) {
        wasm.bvstengine_load_synth(this.__wbg_ptr, id);
    }
    /**
     * @param {number} sample_rate
     * @returns {BvstEngine}
     */
    static new(sample_rate) {
        const ret = wasm.bvstengine_new(sample_rate);
        return BvstEngine.__wrap(ret);
    }
    /**
     * @param {Float32Array} input
     * @param {Float32Array} output
     */
    process(input, output) {
        const ptr0 = passArrayF32ToWasm0(input, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(output, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.bvstengine_process(this.__wbg_ptr, ptr0, len0, ptr1, len1, output);
    }
    /**
     * @param {number} id
     * @param {number} value
     */
    set_param(id, value) {
        wasm.bvstengine_set_param(this.__wbg_ptr, id, value);
    }
}
if (Symbol.dispose) BvstEngine.prototype[Symbol.dispose] = BvstEngine.prototype.free;

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1 = function(arg0, arg1, arg2) {
        new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('bvst_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

// export { initSync };
const init = __wbg_init;


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