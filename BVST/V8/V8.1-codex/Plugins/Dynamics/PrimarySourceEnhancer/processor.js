// System/shared/wasm_loader_unified.js
// BVST Universal Unified Loader
// Supports: Synths, FX, Samplers, and Hybrid Plugins.
// Features: 4-channel Process, Parameter Control, State Management, Sample Loading, Note Events.

let wasm;

// --- Memory Management Helpers ---
const heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);
let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (
        cachedDataViewMemory0 === null ||
        (cachedDataViewMemory0.buffer.detached === true) ||
        (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)
    ) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

// Text Decoder
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

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

function bytesToHex(u8) {
    let out = '';
    const n = u8.length >>> 0;
    for (let i = 0; i < n; i++) {
        const b = u8[i] & 0xff;
        out += b.toString(16).padStart(2, '0');
    }
    return out;
}

function safeGetStringFromWasm(ptr, len) {
    ptr = ptr >>> 0;
    len = len >>> 0;

    const MAX_LEN = 1024;
    const safeLen = Math.min(len, MAX_LEN);

    let msg = '';
    try {
        msg = getStringFromWasm0(ptr, safeLen);
    } catch (e) {
        const preview = getUint8ArrayMemory0().subarray(ptr, ptr + Math.min(safeLen, 64));
        return `WASM throw decode failed (ptr=${ptr} len=${len}) err=${e} hex=${bytesToHex(preview)}`;
    }

    // If the decoded string looks like garbage (mostly NULs), add a small hex preview.
    let nulCount = 0;
    for (let i = 0; i < msg.length; i++) if (msg.charCodeAt(i) === 0) nulCount++;
    if (msg.length > 0 && (nulCount / msg.length) > 0.5) {
        const preview = getUint8ArrayMemory0().subarray(ptr, ptr + Math.min(safeLen, 64));
        return `WASM throw (ptr=${ptr} len=${len}) decoded_nuls=${nulCount}/${msg.length} hex=${bytesToHex(preview)}`;
    }

    if (len > MAX_LEN) msg += `…(truncated, len=${len})`;
    return msg;
}

// Argument Passing
let WASM_VECTOR_LEN = 0;
function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

// String passing (wasm-bindgen compatible)
let cachedTextEncoder = typeof TextEncoder !== 'undefined'
    ? new TextEncoder('utf-8')
    : { encode: (s) => new Uint8Array((s || '').split('').map(ch => ch.charCodeAt(0) & 0xff)) };
if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function(arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return { read: arg.length, written: buf.length };
    };
}
function passStringToWasm0(arg, malloc, realloc) {
    arg = String(arg ?? '');
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();
    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let __wbg_malloc = null;
let __wbg_realloc = undefined;
let __wbg_free = null;

function isWbindgenExportAlias(name) {
    return /^__wbindgen_export(_\d+|\d+)?$/.test(name);
}

function resolveWbindgenMemoryFns() {
    if (!wasm) return;
    if (__wbg_malloc && __wbg_free) return;

    // Prefer explicit exports when present.
    if (typeof wasm.__wbindgen_malloc === 'function') __wbg_malloc = wasm.__wbindgen_malloc;
    if (typeof wasm.__wbindgen_realloc === 'function') __wbg_realloc = wasm.__wbindgen_realloc;
    if (typeof wasm.__wbindgen_free === 'function') __wbg_free = wasm.__wbindgen_free;

    const aliasEntries = [];
    for (const [k, v] of Object.entries(wasm)) {
        if (typeof v !== 'function') continue;
        if (!isWbindgenExportAlias(k)) continue;
        aliasEntries.push([k, v]);
    }
    aliasEntries.sort((a, b) => a[0].localeCompare(b[0]));

    const pickByArity = (arity) => {
        const matches = aliasEntries.filter(([, fn]) => fn.length === arity);
        if (matches.length === 0) return null;
        if (matches.length === 1) return matches[0][1];
        // If multiple aliases share an arity, choose the lexicographically first name.
        return matches[0][1];
    };

    // wasm-bindgen aliases commonly have stable arity:
    //   malloc(len, align) -> 2 args
    //   free(ptr, len, align) -> 3 args
    //   realloc(ptr, old_len, new_len, align) -> 4 args
    if (!__wbg_realloc) __wbg_realloc = pickByArity(4) ?? undefined;
    if (!__wbg_malloc) __wbg_malloc = pickByArity(2);
    if (!__wbg_free) __wbg_free = pickByArity(3);
}

function getWasmMalloc() {
    resolveWbindgenMemoryFns();
    return __wbg_malloc;
}

function getWasmRealloc() {
    resolveWbindgenMemoryFns();
    return __wbg_realloc;
}

function getWasmFree() {
    resolveWbindgenMemoryFns();
    return __wbg_free;
}

// --- Finalization ---
const BvstSynthFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bvstsynth_free(ptr >>> 0, 1));

// --- Main Class ---
export class BvstSynth {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BvstSynth.prototype);
        obj.__wbg_ptr = ptr;
        BvstSynthFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BvstSynthFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bvstsynth_free(ptr, 0);
    }

    // --- Core Methods ---

    static new(sample_rate, plugin_id) {
        const malloc = getWasmMalloc();
        if (typeof malloc !== 'function') throw new Error("WASM malloc export not found.");
        const realloc = getWasmRealloc();
        const ptr0 = passStringToWasm0(plugin_id, malloc, realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bvstsynth_new(sample_rate, ptr0, len0);
        return BvstSynth.__wrap(ret);
    }

    set_param(id, value) {
        const pid = Number(id);
        const pval = Number(value);
        if (!Number.isFinite(pid) || !Number.isFinite(pval)) return;
        wasm.bvstsynth_set_param(this.__wbg_ptr, pid >>> 0, pval);
    }

    // Universal Process: Stereo In -> Stereo Out
    process(in_l, in_r, output_l, output_r) {
        if (!wasm.bvstsynth_process) return;

        const malloc = getWasmMalloc();
        if (typeof malloc !== 'function') return;
        const ptr0 = passArrayF32ToWasm0(in_l, malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(in_r, malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF32ToWasm0(output_l, malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArrayF32ToWasm0(output_r, malloc);
        const len3 = WASM_VECTOR_LEN;

        wasm.bvstsynth_process(
            this.__wbg_ptr,
            ptr0, len0,
            ptr1, len1,
            ptr2, len2, addHeapObject(output_l),
            ptr3, len3, addHeapObject(output_r)
        );
    }

    // --- Optional / Dynamic Methods ---

    get_descriptor() {
        if (!wasm.bvstsynth_get_descriptor) return "{}";

        // Prefer wasm-bindgen's stack-pointer return ABI when available.
        if (typeof wasm.__wbindgen_add_to_stack_pointer === 'function') {
            let deferredPtr;
            let deferredLen;
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                wasm.bvstsynth_get_descriptor(retptr, this.__wbg_ptr);
                deferredPtr = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                deferredLen = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                return getStringFromWasm0(deferredPtr, deferredLen);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                const free = getWasmFree();
                if (typeof free === 'function' && deferredPtr !== undefined && deferredLen !== undefined) {
                    try { free(deferredPtr, deferredLen, 1); } catch (_) {}
                }
            }
        }

        // Fallback ABI (older builds)
        const malloc = getWasmMalloc();
        if (typeof malloc !== 'function') return "{}";
        const retptr = malloc(16, 4);
        try {
            wasm.bvstsynth_get_descriptor(retptr, this.__wbg_ptr);
            const mem = new Int32Array(wasm.memory.buffer);
            const r0 = mem[retptr / 4 + 0];
            const r1 = mem[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            const free = getWasmFree();
            if (typeof free === 'function') {
                try { free(retptr, 16, 4); } catch (_) {}
            }
        }
    }

    get_state() {
        if (!wasm.bvstsynth_get_state) return new Float32Array(0);

        // Prefer wasm-bindgen's stack-pointer return ABI when available.
        if (typeof wasm.__wbindgen_add_to_stack_pointer === 'function') {
            let deferredPtr;
            let deferredLen;
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                wasm.bvstsynth_get_state(retptr, this.__wbg_ptr);
                deferredPtr = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                deferredLen = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                return getFloat32ArrayMemory0().subarray(deferredPtr / 4, deferredPtr / 4 + deferredLen).slice();
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                const free = getWasmFree();
                if (typeof free === 'function' && deferredPtr !== undefined && deferredLen !== undefined) {
                    try { free(deferredPtr, deferredLen * 4, 4); } catch (_) {}
                }
            }
        }

        // Fallback ABI (older builds)
        const malloc = getWasmMalloc();
        const free = getWasmFree();
        if (typeof malloc !== 'function') return new Float32Array(0);
        const retptr = malloc(16, 4);
        try {
            wasm.bvstsynth_get_state(retptr, this.__wbg_ptr);
            const mem = new Int32Array(wasm.memory.buffer);
            const r0 = mem[retptr / 4 + 0];
            const r1 = mem[retptr / 4 + 1];
            const v1 = getFloat32ArrayMemory0().subarray(r0 / 4, r0 / 4 + r1).slice();
            if (typeof free === 'function') {
                try { free(r0, r1 * 4, 4); } catch (_) {}
            }
            return v1;
        } finally {
            if (typeof free === 'function') {
                try { free(retptr, 16, 4); } catch (_) {}
            }
        }
    }

    set_state(state) {
        if (!wasm.bvstsynth_set_state) return;
        const malloc = getWasmMalloc();
        if (typeof malloc !== 'function') return;
        const ptr0 = passArrayF32ToWasm0(state, malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.bvstsynth_set_state(this.__wbg_ptr, ptr0, len0);
    }

    load_sample(data) {
        if (!wasm.bvstsynth_load_sample) {
            console.warn("load_sample called but not supported by this plugin.");
            return;
        }
        const malloc = getWasmMalloc();
        if (typeof malloc !== 'function') return;
        const ptr0 = passArrayF32ToWasm0(data, malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.bvstsynth_load_sample(this.__wbg_ptr, ptr0, len0);
    }

    note_on(note, velocity) {
        if (wasm.bvstsynth_note_on) {
            const n = Number(note);
            const v = Number(velocity);
            if (!Number.isFinite(n) || !Number.isFinite(v)) return;
            wasm.bvstsynth_note_on(this.__wbg_ptr, n, v);
        }
    }

    note_off(note) {
        if (wasm.bvstsynth_note_off) {
            const n = Number(note);
            if (!Number.isFinite(n)) return;
            wasm.bvstsynth_note_off(this.__wbg_ptr, n);
        }
    }

    midi_cc(cc, value) {
        if (wasm.bvstsynth_midi_cc) {
            const c = Number(cc);
            const v = Number(value);
            if (!Number.isFinite(c) || !Number.isFinite(v)) return;
            wasm.bvstsynth_midi_cc(this.__wbg_ptr, c, v);
        }
    }
}

if (Symbol.dispose) BvstSynth.prototype[Symbol.dispose] = BvstSynth.prototype.free;

// --- Init & Load ---

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);
                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("Falling back to instantiate");
                } else {
                    throw e;
                }
            }
        }
        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);
        return (instance instanceof WebAssembly.Instance) ? { instance, module } : instance;
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1 = function(arg0, arg1, arg2) {
        new Uint8Array(getObject(arg2).buffer, getObject(arg2).byteOffset, getObject(arg2).byteLength).set(getArrayU8FromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(safeGetStringFromWasm(arg0, arg1));
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
    __wbg_malloc = null;
    __wbg_realloc = undefined;
    __wbg_free = null;
    return wasm;
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('bvst_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (module_or_path instanceof WebAssembly.Module) {
        const { instance, module } = await __wbg_load(module_or_path, imports);
        return __wbg_finalize_init(instance, module);
    }

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }
    const { instance, module } = await __wbg_load(await module_or_path, imports);
    return __wbg_finalize_init(instance, module);
}

export default __wbg_init;

// --- BVST AudioWorkletProcessor ---
// This code is appended to the wasm-bindgen output.

class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.port.onmessage = this.handleMessage.bind(this);
        this.dummyInput = new Float32Array(128); // Fallback for silence
        this._tmpInL = null;
        this._tmpInR = null;
        this._tmpOutR = null;
        this._reportedWorkletError = false;
        this._eventQueue = [];
        this._queueReadIndex = 0;
        this._maxQueuedEvents = 2048;
        this._maxEventsPerBlock = 256;
        this._wasmReady = false;
        this._pluginId = 'UniversalUtility';
        this._sampleRate = 48000;
        this._restartCooldownBlocks = 32;
        this._restartBackoff = 0;
        this._restartAttempts = 0;
        this._maxRestartAttempts = 3;
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
                    if (typeof this.synth.get_descriptor === 'function') {
                        this.port.postMessage({ type: 'DESCRIPTOR', descriptor: this.synth.get_descriptor() });
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
                    const pluginId =
                        (event.data && typeof event.data.pluginId === 'string' && event.data.pluginId.trim())
                            ? event.data.pluginId
                            : (event.data && typeof event.data.manifestName === 'string' && event.data.manifestName.trim())
                                  ? event.data.manifestName
                                  : 'UniversalUtility';

                    const srCandidate =
                        (typeof sampleRate === 'number' && Number.isFinite(sampleRate) && sampleRate > 0)
                            ? sampleRate
                            : (typeof globalThis !== 'undefined' &&
                               typeof globalThis.sampleRate === 'number' &&
                               Number.isFinite(globalThis.sampleRate) &&
                               globalThis.sampleRate > 0)
                                  ? globalThis.sampleRate
                                  : 48000;

                    this._pluginId = pluginId;
                    this._sampleRate = srCandidate;
                    this._wasmReady = true;
                    this._restartAttempts = 0;
                    this._restartBackoff = 0;

                    this.synth = BvstSynth.new(srCandidate, pluginId);
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
        
        const outL = output[0];
        const outR = output.length > 1 ? output[1] : null;
        const blockSize = outL.length >>> 0;

        // Ensure dummy buffers match block size (protects mono/stereo fallbacks and restart silence fill).
        if (this.dummyInput.length !== blockSize) this.dummyInput = new Float32Array(blockSize);
        if (!this._tmpOutR || this._tmpOutR.length !== blockSize) this._tmpOutR = new Float32Array(blockSize);

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
        
        // Safety: WebAudio should provide equal block sizes, but guard anyway to prevent OOB inside WASM DSP.
        if (inL.length !== blockSize) {
            if (inL.length > blockSize) {
                inL = inL.subarray(0, blockSize);
            } else {
                if (!this._tmpInL || this._tmpInL.length !== blockSize) this._tmpInL = new Float32Array(blockSize);
                this._tmpInL.fill(0);
                this._tmpInL.set(inL);
                inL = this._tmpInL;
            }
        }
        if (inR.length !== blockSize) {
            if (inR.length > blockSize) {
                inR = inR.subarray(0, blockSize);
            } else {
                if (!this._tmpInR || this._tmpInR.length !== blockSize) this._tmpInR = new Float32Array(blockSize);
                this._tmpInR.fill(0);
                this._tmpInR.set(inR);
                inR = this._tmpInR;
            }
        }

        // If we don't currently have a synth (crash or not initialized), keep output silent.
        if (!this.synth) {
            outL.fill(0);
            if (outR) outR.fill(0);

            // Attempt to recover automatically without requiring a page reload.
            if (this._wasmReady) {
                if (this._restartBackoff > 0) {
                    this._restartBackoff--;
                } else if (this._restartAttempts < this._maxRestartAttempts && typeof BvstSynth !== 'undefined') {
                    try {
                        this.synth = BvstSynth.new(this._sampleRate, this._pluginId);
                        this._reportedWorkletError = false;
                        this._restartAttempts = 0;
                        this.port.postMessage({ type: 'STATUS', msg: 'Audio engine recovered' });
                    } catch (e) {
                        this._restartAttempts++;
                        this._restartBackoff = this._restartCooldownBlocks;
                        this._reportWorkletError('RECOVER', e);
                    }
                }
            }

            return true;
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
                    let targetR = outR ? outR : this._tmpOutR;
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
                this._restartBackoff = this._restartCooldownBlocks;
                this._restartAttempts = Math.min(this._restartAttempts + 1, this._maxRestartAttempts);
                return true;
            }
        }
        return true;
    }
}

registerProcessor('bvst-processor', BvstProcessor);
